import json
import logging
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.core.cache import cache
from asgiref.sync import sync_to_async

logger = logging.getLogger(__name__)

class MessageConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer for handling real-time messaging
    """
    async def connect(self):
        """
        Handle WebSocket connection - join user-specific group and set online status
        """
        # Get the user from scope (set by middleware)
        user = self.scope['user']
        
        # Reject connection if user is not authenticated
        if user.is_anonymous:
            logger.warning("Anonymous user attempted to connect to WebSocket")
            await self.close()
            return
        
        # Set user's notification group
        self.user_group = f"user_{user.id}_notifications"
        
        # Add this connection to the user's group
        await self.channel_layer.group_add(
            self.user_group,
            self.channel_name
        )
        
        # Accept the WebSocket connection
        await self.accept()
        
        # Set user as online in cache and send status update
        await self.set_user_online(user.id)
        
        # Send connection established message with connection ID
        await self.send(text_data=json.dumps({
            'type': 'connection_established',
            'data': {
                'connection_id': self.channel_name,
                'user_id': user.id,
                'status': 'connected'
            }
        }))
        
        logger.info(f"User {user.id} connected via WebSocket, channel: {self.channel_name}")
    
    async def disconnect(self, close_code):
        """
        Handle WebSocket disconnection - leave group and set offline status
        """
        # Get the user from scope
        user = self.scope['user']
        
        if not user.is_anonymous:
            # Remove this connection from the user's connections list
            await self.remove_user_connection(user.id, self.channel_name)
            
            # Leave the group
            if hasattr(self, 'user_group'):
                await self.channel_layer.group_discard(
                    self.user_group,
                    self.channel_name
                )
            
            logger.info(f"User {user.id} disconnected from WebSocket, code: {close_code}")
        else:
            logger.warning(f"Anonymous user disconnected from WebSocket, code: {close_code}")
    
    async def receive(self, text_data):
        """
        Handle messages received from WebSocket
        """
        user = self.scope['user']
        
        try:
            data = json.loads(text_data)
            message_type = data.get('type')
            
            if not message_type:
                logger.warning(f"Received message without type from user {user.id}")
                return
            
            logger.debug(f"Received {message_type} from user {user.id}")
            
            # Handle different message types
            if message_type == 'heartbeat':
                # Respond to heartbeat with ack
                await self.send(text_data=json.dumps({
                    'type': 'heartbeat_ack',
                    'data': {
                        'timestamp': data.get('timestamp', None)
                    }
                }))
            
            elif message_type == 'mark_read':
                # Handle marking messages as read
                conversation_id = data.get('data', {}).get('conversation_id')
                message_ids = data.get('data', {}).get('message_ids', [])
                
                if conversation_id and message_ids:
                    await self.mark_messages_as_read(user.id, conversation_id, message_ids)
            
            # Other message types can be handled here
        
        except json.JSONDecodeError:
            logger.warning(f"Received invalid JSON from user {user.id}")
        except Exception as e:
            logger.error(f"Error processing message: {str(e)}")
    
    async def message_notification(self, event):
        """
        Send message notification to WebSocket
        """
        # Send message to WebSocket
        await self.send(text_data=json.dumps({
            'type': 'message',
            'data': event['data']
        }))
    
    async def user_status_update(self, event):
        """
        Send user status update to WebSocket
        """
        # Send user status update to WebSocket
        await self.send(text_data=json.dumps({
            'type': 'user_status_update',
            'user_id': event['user_id'],
            'is_online': event['is_online']
        }))
    
    @database_sync_to_async
    def set_user_online(self, user_id):
        """
        Set user as online in cache and notify connections
        """
        # Get the current connections for this user
        connections = cache.get(f"user_{user_id}_connections", set())
        
        # Convert to set if it's not already (for backward compatibility)
        if not isinstance(connections, set):
            connections = set([connections]) if connections else set()
        
        # Add this connection
        connections.add(self.channel_name)
        
        # Update the connections cache with 24h expiry
        cache.set(f"user_{user_id}_connections", connections, 86400)
        
        # Set the user as online with 5 minute expiry (if connections disappear)
        was_online = cache.get(f"user_{user_id}_online", False)
        cache.set(f"user_{user_id}_online", True, 300)
        
        # Only broadcast status change if it's a change
        if not was_online:
            self._notify_user_status_change(user_id, True)
    
    @database_sync_to_async
    def remove_user_connection(self, user_id, channel_name):
        """
        Remove a connection from user's connections and set offline if no connections left
        """
        # Get the current connections for this user
        connections = cache.get(f"user_{user_id}_connections", set())
        
        # Convert to set if it's not already
        if not isinstance(connections, set):
            connections = set([connections]) if connections else set()
        
        # Remove this connection
        if channel_name in connections:
            connections.remove(channel_name)
        
        # If there are still connections, update the cache
        if connections:
            cache.set(f"user_{user_id}_connections", connections, 86400)
            return
        
        # No connections left, set user as offline
        was_online = cache.get(f"user_{user_id}_online", False)
        cache.delete(f"user_{user_id}_online")
        
        # Only broadcast status change if it's a change
        if was_online:
            self._notify_user_status_change(user_id, False)
    
    def _notify_user_status_change(self, user_id, is_online):
        """
        Notify relevant users about a user's status change
        """
        from asgiref.sync import async_to_sync
        from channels.layers import get_channel_layer
        from conversations.models import Conversation
        from django.db.models import Q
        
        try:
            # Find all conversations this user participates in
            conversations = Conversation.objects.filter(
                Q(participant1_id=user_id) | Q(participant2_id=user_id)
            )
            
            channel_layer = get_channel_layer()
            
            # For each conversation, notify the other participant
            for conversation in conversations:
                # Determine the other participant
                other_user_id = conversation.participant2_id if conversation.participant1_id == user_id else conversation.participant1_id
                
                # Get the notification group for the other user
                other_user_group = f"user_{other_user_id}_notifications"
                
                # Send the status update to the other user
                async_to_sync(channel_layer.group_send)(
                    other_user_group,
                    {
                        "type": "user_status_update",
                        "user_id": user_id,
                        "is_online": is_online
                    }
                )
                
                logger.debug(f"Sent status update for user {user_id} (online: {is_online}) to user {other_user_id}")
        
        except Exception as e:
            logger.error(f"Error notifying status change: {str(e)}")
    
    @database_sync_to_async
    def mark_messages_as_read(self, user_id, conversation_id, message_ids):
        """
        Mark messages as read in the database
        """
        from user_messages.models import UserMessage
        from django.db.models import Q
        
        try:
            # Update messages to 'read' status
            updated = UserMessage.objects.filter(
                Q(~Q(sender_id=user_id)),  # Put the Q object first as a positional argument
                conversation_id=conversation_id,
                message_id__in=message_ids
            ).update(status='read')
            
            logger.debug(f"Marked {updated} messages as read for user {user_id} in conversation {conversation_id}")
            
            # Could send a confirmation back to the client if needed
        except Exception as e:
            logger.error(f"Error marking messages as read: {str(e)}") 
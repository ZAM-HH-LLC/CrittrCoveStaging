import { Platform } from 'react-native';
import MessageHistory from '../../screens/MessageHistory'; // Original web version
import MobileMessageHistory from './mobile/MobileMessageHistory'; // New mobile version

const MessageHistoryWrapper = (props) => {
  // Use original MessageHistory for web, new MobileMessageHistory for mobile
  if (Platform.OS === 'web') {
    return MessageHistory(props);
  } else {
    return MobileMessageHistory(props);
  }
};

export default MessageHistoryWrapper;
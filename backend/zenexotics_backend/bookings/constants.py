class BookingStates:
    """
    Booking States and Button Visibility Logic:

    Button Visibility Rules:
    1. Send to Client Button (Professional Only):
        - Visible during: PENDING_INITIAL_PROFESSIONAL_CHANGES, PENDING_PROFESSIONAL_CHANGES, 
                         CONFIRMED_PENDING_PROFESSIONAL_CHANGES
        - Hidden during all other states

    2. Deny Button (Professional Only):
        - Visible during: PENDING_INITIAL_PROFESSIONAL_CHANGES
        - Hidden during all other states

    3. Cancel Button (Both Professional and Client):
        - Visible during: PENDING_PROFESSIONAL_CHANGES, CONFIRMED, CONFIRMED_PENDING_PROFESSIONAL_CHANGES,
                         CONFIRMED_PENDING_CLIENT_APPROVAL
        - Hidden during all other states

    4. Approve Button (Client Only):
        - Visible during: PENDING_CLIENT_APPROVAL, CONFIRMED_PENDING_CLIENT_APPROVAL
        - Hidden during all other states

    State Flow:
    1. Initial Flow: DRAFT → PENDING_INITIAL_PROFESSIONAL_CHANGES
    2. Professional Review: PENDING_INITIAL_PROFESSIONAL_CHANGES → DENIED or PENDING_CLIENT_APPROVAL
    3. Client Review: PENDING_CLIENT_APPROVAL → CONFIRMED or PENDING_PROFESSIONAL_CHANGES
    4. Active States: CONFIRMED → CONFIRMED_PENDING_PROFESSIONAL_CHANGES → CONFIRMED_PENDING_CLIENT_APPROVAL
    5. Terminal States: COMPLETED, CANCELLED, DENIED
    """

    # Initial States
    DRAFT = 'Draft'
    PENDING_INITIAL_PROFESSIONAL_CHANGES = 'Pending Initial Professional Changes'

    # Review States
    PENDING_PROFESSIONAL_CHANGES = 'Pending Professional Changes'
    PENDING_CLIENT_APPROVAL = 'Pending Client Approval'
    
    # Active States
    CONFIRMED = 'Confirmed'
    CONFIRMED_PENDING_PROFESSIONAL_CHANGES = 'Confirmed Pending Professional Changes'
    CONFIRMED_PENDING_CLIENT_APPROVAL = 'Confirmed Pending Client Approval'
    
    # Terminal States
    COMPLETED = 'Completed'
    DENIED = 'Denied'
    CANCELLED = 'Cancelled'

    # Map of internal states to display states (what frontend sees)
    DISPLAY_STATES = {
        DRAFT: 'Draft',
        PENDING_INITIAL_PROFESSIONAL_CHANGES: 'Pending Initial Professional Changes',
        PENDING_PROFESSIONAL_CHANGES: 'Pending Professional Changes',
        PENDING_CLIENT_APPROVAL: 'Pending Client Approval',
        CONFIRMED: 'Confirmed',
        CONFIRMED_PENDING_PROFESSIONAL_CHANGES: 'Confirmed Pending Professional Changes',
        CONFIRMED_PENDING_CLIENT_APPROVAL: 'Confirmed Pending Client Approval',
        COMPLETED: 'Completed',
        DENIED: 'Denied',
        CANCELLED: 'Cancelled'
    }

    # States where professional can edit
    PROFESSIONAL_EDITABLE_STATES = [
        DRAFT,
        PENDING_INITIAL_PROFESSIONAL_CHANGES,
        PENDING_PROFESSIONAL_CHANGES,
        CONFIRMED_PENDING_PROFESSIONAL_CHANGES,
        CONFIRMED
    ]

    # States where client can approve/request changes
    CLIENT_ACTIONABLE_STATES = [
        PENDING_CLIENT_APPROVAL,
        CONFIRMED_PENDING_CLIENT_APPROVAL
    ]

    @classmethod
    def get_display_state(cls, state):
        """Convert internal state to display state"""
        return cls.DISPLAY_STATES.get(state, state)

    @classmethod
    def can_professional_edit(cls, state):
        """Check if professional can edit in this state"""
        return state in cls.PROFESSIONAL_EDITABLE_STATES

    @classmethod
    def can_client_act(cls, state):
        """Check if client can take action in this state"""
        return state in cls.CLIENT_ACTIONABLE_STATES 
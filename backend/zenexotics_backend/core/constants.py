class UnitOfTime:
    FIFTEEN_MINUTES = '15 Min'
    THIRTY_MINUTES = '30 Min'
    FORTY_FIVE_MINUTES = '45 Min'
    ONE_HOUR = '1 Hour'
    TWO_HOURS = '2 Hour'
    THREE_HOURS = '3 Hour'
    FOUR_HOURS = '4 Hour'
    FIVE_HOURS = '5 Hour'
    SIX_HOURS = '6 Hour'
    SEVEN_HOURS = '7 Hour'
    EIGHT_HOURS = '8 Hour'
    TWENTY_FOUR_HOURS = '24 Hour'
    PER_DAY = 'Per Day'
    PER_NIGHT = 'Per Night'
    PER_VISIT = 'Per Visit'
    WEEK = 'Week'


STATE_TAX_RATES = {
  "AL": {"taxable": False, "state_rate": 0.04},
  "AK": {"taxable": False, "state_rate": 0.00},
  "AZ": {"taxable": False, "state_rate": 0.056},
  "AR": {"taxable": True,  "state_rate": 0.065},
  "CA": {"taxable": False, "state_rate": 0.0725},
  "CO": {"taxable": False, "state_rate": 0.029},
  "CT": {"taxable": True,  "state_rate": 0.0635},
  "DE": {"taxable": False, "state_rate": 0.00},
  "FL": {"taxable": False, "state_rate": 0.06},
  "GA": {"taxable": False, "state_rate": 0.04},
  "HI": {"taxable": True,  "state_rate": 0.04167},
  "ID": {"taxable": False, "state_rate": 0.06},
  "IL": {"taxable": False, "state_rate": 0.0625},
  "IN": {"taxable": False, "state_rate": 0.07},
  "IA": {"taxable": False, "state_rate": 0.06},
  "KS": {"taxable": False, "state_rate": 0.065},
  "KY": {"taxable": True,  "state_rate": 0.06},
  "LA": {"taxable": False, "state_rate": 0.0445},
  "ME": {"taxable": False, "state_rate": 0.055},
  "MD": {"taxable": False, "state_rate": 0.06},
  "MA": {"taxable": False, "state_rate": 0.0625},
  "MI": {"taxable": False, "state_rate": 0.06},
  "MN": {"taxable": True,  "state_rate": 0.06875},
  "MS": {"taxable": False, "state_rate": 0.07},
  "MO": {"taxable": False, "state_rate": 0.04225},
  "MT": {"taxable": False, "state_rate": 0.00},
  "NE": {"taxable": True,  "state_rate": 0.055},
  "NV": {"taxable": False, "state_rate": 0.0685},
  "NH": {"taxable": False, "state_rate": 0.00},
  "NJ": {"taxable": True,  "state_rate": 0.06625},
  "NM": {"taxable": True,  "state_rate": 0.0525},
  "NY": {"taxable": False, "state_rate": 0.04},
  "NC": {"taxable": False, "state_rate": 0.0475},
  "ND": {"taxable": False, "state_rate": 0.05},
  "OH": {"taxable": False, "state_rate": 0.0575},
  "OK": {"taxable": False, "state_rate": 0.045},
  "OR": {"taxable": False, "state_rate": 0.00},
  "PA": {"taxable": False, "state_rate": 0.06},
  "RI": {"taxable": True,  "state_rate": 0.07},
  "SC": {"taxable": False, "state_rate": 0.06},
  "SD": {"taxable": True,  "state_rate": 0.042},
  "TN": {"taxable": False, "state_rate": 0.07},
  "TX": {"taxable": False, "state_rate": 0.0625},
  "UT": {"taxable": False, "state_rate": 0.0485},
  "VT": {"taxable": False, "state_rate": 0.06},
  "VA": {"taxable": False, "state_rate": 0.043},
  "WA": {"taxable": False, "state_rate": 0.065},
  "WV": {"taxable": True,  "state_rate": 0.06},
  "WI": {"taxable": False, "state_rate": 0.05},
  "WY": {"taxable": False, "state_rate": 0.04},
  "DC": {"taxable": "service_fee_only", "state_rate": 0.06}
}





class Facility:
    YARD = 'yard'
    ROAM = 'roam'
    AC = 'ac'
    FURNITURE = 'furniture'
    BED = 'bed'
    CRATE = 'crate'
    PET_DOOR = 'pet_door'
    TOYS = 'toys'
    FIRST_AID = 'first_aid'
    CAMERAS = 'cameras'
    COVERED_PATIO = 'covered_patio'
    GARDEN = 'garden'
    HEATING = 'heating'
    FEEDING_STATION = 'feeding_station'
    WATER_FOUNTAIN = 'water_fountain'
    SCRATCHING_POST = 'scratching_post'
    LITTER_AREA = 'litter_area'



# This class is also defined in the bookings/constants.py file. remove in future.
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
    PENDING_INITIAL_PROFESSIONAL_CHANGES = 'Pending initial Professional Changes'

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
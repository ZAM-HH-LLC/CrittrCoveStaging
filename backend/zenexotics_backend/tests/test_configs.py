TEST_CONFIGS = [
    {
        "test_number": 1,
        "test_identifier": "test_get_professional_dashboard",
        "endpoint": "/api/professionals/v1/dashboard/",
        "test_title": "Get Pro Dashboard",
        "rename_map": {
            "test_get_professional_dashboard": "test_get_professional_dashboard_match",
            "test_unauthenticated_access": "test_unauthenticated_access"
        }
    },
    {
        "test_number": 2,
        "test_identifier": "test_get_pro_bookings",
        "endpoint": "/api/bookings/v1/",
        "test_title": "Get All Bookings For user",
        "rename_map": {
            "test_get_pro_bookings": "test_get_pro_bookings_match",
            "test_get_client_bookings": "test_get_client_bookings_match",
            "test_get_no_bookings": "test_get_no_bookings_match",
            "test_unauthenticated_access": "test_unauthenticated_access"
        }
    },
    {
        "test_number": 3,
        "test_identifier": "test_get_pro_services",
        "endpoint": "/api/professionals/v1/services/",
        "test_title": "Get Professional Services",
        "rename_map": {
            "test_get_pro_services": "test_get_pro_services_match",
            "test_get_inactive_services": "test_get_inactive_services_match",
            "test_unauthenticated_access": "test_unauthenticated_access"
        }
    }
] 
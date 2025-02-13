(function($) {
    $(document).ready(function() {
        var $professionalSelect = $('#id_professional');
        var $serviceSelect = $('#id_service_id');

        function updateServices(professionalId) {
            if (!professionalId) {
                $serviceSelect.html('<option value="">---------</option>').prop('disabled', true);
                return;
            }

            $.getJSON('/api/professionals/v1/services/' + professionalId + '/', function(data) {
                var options = '<option value="">---------</option>';
                $.each(data, function(index, service) {
                    if (service.moderation_status === 'APPROVED') {
                        options += '<option value="' + service.service_id + '">' + 
                                 service.service_name + '</option>';
                    }
                });
                $serviceSelect.html(options).prop('disabled', false);
            });
        }

        // Initial state
        if (!$professionalSelect.val()) {
            $serviceSelect.prop('disabled', true);
        }

        // Handle professional selection change
        $professionalSelect.change(function() {
            updateServices($(this).val());
        });
    });
})(django.jQuery); 
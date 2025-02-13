from django.test.runner import DiscoverRunner
from django.db import connections
import json
from termcolor import colored
import logging
from unittest.runner import TextTestResult
import sys
from io import StringIO
import time
import os
from .test_configs import TEST_CONFIGS

class QuietStream(StringIO):
    def writeln(self, msg=None):
        if msg is not None:
            self.write(msg)
        self.write('\n')

class ColorizedTestResult(TextTestResult):
    def __init__(self, stream, descriptions, verbosity):
        self.quiet_stream = QuietStream()
        super().__init__(self.quiet_stream, descriptions, verbosity)
        self.successes = []
        self.start_time = None
        self.time_taken = 0
        
    def startTest(self, test):
        self.start_time = time.time()
        # Don't call parent to avoid progress output
        self.testsRun += 1

    def addSuccess(self, test):
        # Don't call parent to avoid progress output
        self.successes.append(test)
        if self.start_time:
            self.time_taken += time.time() - self.start_time

    def addError(self, test, err):
        # Don't call parent to avoid progress output
        self.errors.append((test, self._exc_info_to_string(err, test)))
        if self.start_time:
            self.time_taken += time.time() - self.start_time

    def addFailure(self, test, err):
        # Don't call parent to avoid progress output
        self.failures.append((test, self._exc_info_to_string(err, test)))
        if self.start_time:
            self.time_taken += time.time() - self.start_time

    def printErrors(self):
        # Override to prevent printing error summary
        pass

    def getDescription(self, test):
        doc_first_line = test._testMethodDoc.split('\n')[0] if test._testMethodDoc else str(test)
        return f"{doc_first_line:<45} ... "

class ExistingDatabaseTestRunner(DiscoverRunner):
    def get_resultclass(self):
        return ColorizedTestResult

    def setup_databases(self, **kwargs):
        """Use existing database instead of creating a new one."""
        self.keepdb = True
        return super().setup_databases(**kwargs)

    def teardown_databases(self, old_config, **kwargs):
        """Don't destroy the database after tests."""
        pass

    def run_tests(self, test_labels, extra_tests=None, **kwargs):
        # Temporarily disable logging
        logging.disable(logging.CRITICAL)
        
        # Run tests and store result
        result = super().run_tests(test_labels, extra_tests, **kwargs)
        
        # Re-enable logging
        logging.disable(logging.NOTSET)
        
        return result

    def run_suite(self, suite, **kwargs):
        """Override to customize test output"""
        # Capture all output
        output_buffer = StringIO()
        original_stdout = sys.stdout
        sys.stdout = output_buffer

        result = super().run_suite(suite, **kwargs)
        
        # Get the captured output
        output = output_buffer.getvalue()
        sys.stdout = original_stdout

        # Write our custom output to file
        test_output_dir = os.path.dirname(os.path.abspath(__file__))
        output_file = os.path.join(test_output_dir, "test_output")
        with open(output_file, "w") as f:
            for config in TEST_CONFIGS:
                # Write header for test group
                f.write("\nRUNNING TESTS\n\n")
                
                # Write API responses if available
                for test_case in result.successes:
                    if config["test_identifier"] in str(test_case):
                        if hasattr(test_case, 'last_response'):
                            f.write(f"Test #{config['test_number']}:\n")
                            f.write(f"API Response from {config['endpoint']}:\n")
                            f.write("-------------\n")
                            f.write(json.dumps(test_case.last_response, indent=4))
                            f.write("\n\n")

                # Write test results
                f.write(f"Test Results For {config['test_title']}:\n")
                f.write("-------------\n")
                
                # Get all test cases for this config
                test_cases = []
                for test in suite:
                    if config["test_identifier"] in str(test) or "test_unauthenticated_access" in str(test):
                        test_cases.append(test)

                # Process each test case
                for test_case in test_cases:
                    test_name = str(test_case).split(" ")[0]
                    test_name_display = test_name
                    
                    # Apply rename if exists
                    if any(old_name in test_name for old_name in config["rename_map"].keys()):
                        for old_name, new_name in config["rename_map"].items():
                            if old_name in test_name:
                                test_name_display = new_name
                                break
                    
                    test_name_display = test_name_display.ljust(50)
                    
                    # Check test result
                    if test_case in result.successes:
                        f.write(f"✓ {test_name_display}: Pass\n")
                    elif any(test_case == failure[0] for failure in result.failures):
                        f.write(f"✗ {test_name_display}: Fail\n")
                        for failure in result.failures:
                            if test_case == failure[0]:
                                f.write(f"  Error: {str(failure[1])}\n")
                    elif any(test_case == error[0] for error in result.errors):
                        f.write(f"! {test_name_display}: Error\n")
                        for error in result.errors:
                            if test_case == error[0]:
                                f.write(f"  Error: {str(error[1])}\n")
                    elif test_case in result.skipped:
                        f.write(f"- {test_name_display}: Skipped\n")
                
                f.write("\n")
                if result.wasSuccessful():
                    f.write("----------------------------------------------------------------------\n")
                    f.write(f"Ran {result.testsRun} tests in {result.time_taken:.3f}s - OK (PASS)\n\n\n")
                else:
                    f.write("----------------------------------------------------------------------\n")
                    f.write(f"Ran {result.testsRun} tests in {result.time_taken:.3f}s - FAILED\n\n\n")

        # Print the original output
        print(output)
            
        return result 
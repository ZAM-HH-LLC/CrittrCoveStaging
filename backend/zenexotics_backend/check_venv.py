import sys
import os

print("Python executable:", sys.executable)
print("sys.prefix:", sys.prefix)
print("sys.base_prefix:", sys.base_prefix)
print("Virtual env active:", sys.prefix != sys.base_prefix)
print("VIRTUAL_ENV env var:", os.environ.get('VIRTUAL_ENV')) 
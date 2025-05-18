FROM amazonlinux:2023
# Install system dependencies
RUN dnf update -y && dnf install -y python3 python3-pip gcc python3-devel git libpq-devel libjpeg-turbo-devel python3-setuptools postgresql15 postgresql15-server postgresql15-devel
# Create app directory
WORKDIR /app
# Copy the Django project
COPY . /app
# Modify manage.py to bypass venv check
RUN sed -i 's/if not is_venv_active():/if False:/' manage.py
# Install required packages with --ignore-installed to avoid conflicts
RUN pip3 install --ignore-installed python-dotenv dj-database-url psycopg2-binary
RUN pip3 install --ignore-installed django==4.2.7 djangorestframework==3.14.0 djangorestframework-simplejwt==5.3.0
RUN pip3 install --ignore-installed django-cors-headers==4.3.1 django-filter==23.5
RUN pip3 install --ignore-installed channels==4.0.0 daphne==4.0.0 channels-redis==4.1.0
RUN pip3 install --ignore-installed pillow==10.0.0

# Create dot env file with database config
RUN echo "DEBUG=True" > .env
RUN echo "DJANGO_ENVIRONMENT=development" >> .env
RUN echo "DATABASE_URL=postgres://postgres:postgres@localhost:5432/zenexotics" >> .env
RUN echo "DJANGO_SECRET_KEY=test-secret-key" >> .env
RUN echo "EMAIL_PORT=587" >> .env
RUN echo "EMAIL_HOST=smtp.example.com" >> .env
RUN echo "EMAIL_HOST_USER=test@example.com" >> .env
RUN echo "EMAIL_HOST_PASSWORD=password" >> .env
RUN echo "EMAIL_USE_TLS=True" >> .env
RUN echo "EMAIL_USE_SSL=False" >> .env

# Initialize PostgreSQL
RUN postgresql-setup --initdb
RUN echo "host all all 0.0.0.0/0 md5" >> /var/lib/pgsql/data/pg_hba.conf
RUN echo "listen_addresses='*'" >> /var/lib/pgsql/data/postgresql.conf

# Expose ports
EXPOSE 8000
EXPOSE 5432

# Start PostgreSQL and run Django
CMD sh -c "postgres -D /var/lib/pgsql/data & sleep 10 && createdb -U postgres zenexotics && python3 manage.py migrate --noinput && python3 manage.py collectstatic --noinput && python3 manage.py runserver 0.0.0.0:8000" 
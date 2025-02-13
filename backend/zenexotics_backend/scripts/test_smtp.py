import smtplib

def test_smtp_connection():
    try:
        # Connect to the SMTP server
        server = smtplib.SMTP('smtp.gmail.com', 587)
        server.starttls()  # Secure the connection
        server.login('zam.hh.llc@gmail.com', 'tnrz nsbl uhiu dmxb')  # Replace with your credentials
        print("Connected successfully")
        server.quit()
    except Exception as e:
        print(f"Failed to connect: {e}")

if __name__ == "__main__":
    test_smtp_connection()


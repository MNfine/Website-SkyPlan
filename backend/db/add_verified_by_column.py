"""
Add verified_by column to payments table for tracking payment verification source.

Migration script to add the new column for proper payment refactoring:
- verified_by: tracks which channel verified the payment (blockchain, vnpay, manual, etc.)

This enables the new architecture:
  Verify payment by channel (blockchain XOR gateway)
  → Grant rewards by policy (separate from payment method)
"""

from sqlalchemy import create_engine, text
from dotenv import load_dotenv
import os

# Load environment variables from .env file
load_dotenv()

def add_verified_by_column():
    """Add verified_by column to payments table if it doesn't exist."""
    database_url = os.getenv('DATABASE_URL')
    if not database_url:
        print("❌ DATABASE_URL not set")
        return False
    
    try:
        engine = create_engine(database_url)
        with engine.begin() as connection:
            # Check if column exists
            result = connection.execute(text(
                "SELECT column_name FROM information_schema.columns "
                "WHERE table_name='payments' AND column_name='verified_by'"
            )).fetchone()
            
            if result:
                print("✓ Column 'verified_by' already exists in payments table")
                return True
            
            # Add column
            print("Adding column 'verified_by' to payments table...")
            connection.execute(text(
                "ALTER TABLE payments ADD COLUMN verified_by VARCHAR(20) NULL"
            ))
            print("✓ Column 'verified_by' added successfully")
            
            # Create index for faster queries
            print("Creating index on verified_by column...")
            connection.execute(text(
                "CREATE INDEX idx_payments_verified_by ON payments(verified_by)"
            ))
            print("✓ Index created successfully")
            
            return True
            
    except Exception as e:
        print(f"❌ Error adding column: {e}")
        return False


if __name__ == '__main__':
    success = add_verified_by_column()
    exit(0 if success else 1)

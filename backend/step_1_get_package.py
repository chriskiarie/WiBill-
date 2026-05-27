#!/usr/bin/env python3
"""
STEP 1: Get a Real Package ID from Database
Run this to fetch the first package UUID
"""

import psycopg2
import sys

print("")
print("STEP 1: Get a Real Package UUID from Database")
print("")

try:
    # Connect to database
    print("Connecting to database...")
    conn = psycopg2.connect(
        host="localhost",
        database="honestbill",
        user="honestbill",
        password="honestbill_dev_secret"
    )
    
    cursor = conn.cursor()
    
    # Query for first package
    query = """
    SELECT id, name, price_ksh FROM packages 
    WHERE tenant_id = (SELECT id FROM tenants WHERE slug = 'test-isp')
    LIMIT 1;
    """
    
    cursor.execute(query)
    result = cursor.fetchone()
    
    if result:
        package_id, name, price = result
        print("SUCCESS: Found package")
        print(f"  Package ID: {package_id}")
        print(f"  Name: {name}")
        print(f"  Price: KSH {price}")
        print("")
        print(f"COPY THIS ID FOR NEXT STEPS:")
        print(f"  {package_id}")
        print("")
    else:
        print("ERROR: No packages found")
        sys.exit(1)
    
    cursor.close()
    conn.close()
    
except psycopg2.Error as e:
    print(f"ERROR: Database connection failed")
    print(f"  {e}")
    print("")
    print("Make sure PostgreSQL is running:")
    print("  - Host: localhost")
    print("  - Port: 5432")
    print("  - Database: honestbill")
    print("  - User: honestbill")
    sys.exit(1)

except Exception as e:
    print(f"ERROR: {e}")
    sys.exit(1)

print("")
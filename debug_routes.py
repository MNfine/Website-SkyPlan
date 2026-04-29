#!/usr/bin/env python
"""Debug script to check Flask routes"""

import sys
sys.path.insert(0, '.')

from backend.app import app

print("\n" + "="*80)
print("MARK-PAID ROUTES CHECK")
print("="*80)

found_mark_routes = []
found_test_route = None

for rule in app.url_map.iter_rules():
    rule_str = str(rule.rule)
    endpoint = str(rule.endpoint)
    methods = list(rule.methods - {'HEAD', 'OPTIONS'})
    
    if 'mark' in rule_str.lower():
        found_mark_routes.append({
            'rule': rule_str,
            'endpoint': endpoint,
            'methods': methods
        })
    
    if '/api/payment/test' in rule_str:
        found_test_route = {
            'rule': rule_str,
            'endpoint': endpoint,
            'methods': methods
        }

print(f"\nFound {len(found_mark_routes)} 'mark' routes:")
for route in found_mark_routes:
    print(f"  {route['rule']:40} -> {route['endpoint']:30} -> {route['methods']}")

print(f"\nTest route status:")
if found_test_route:
    print(f"  ✓ {found_test_route['rule']:40} -> {found_test_route['endpoint']:30} -> {found_test_route['methods']}")
else:
    print(f"  ✗ /api/payment/test NOT FOUND")

print("\nAll POST routes in /api/payment prefix:")
for rule in app.url_map.iter_rules():
    if '/api/payment' in rule.rule and 'POST' in rule.methods:
        methods = list(rule.methods - {'HEAD', 'OPTIONS'}) 
        print(f"  {rule.rule:40} -> {rule.endpoint:30} -> {methods}")

print("\n" + "="*80)

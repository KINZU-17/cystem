import sys
import os

sys.path.insert(0, '/home/james-nzuki/snap/antigravity-cli/common/local/lib/python3.14/dist-packages')
sys.path.insert(0, './server')

from tests.test_cystem import (
    setup_module,
    test_health_check,
    test_password_security_rules,
    test_haversine_distance_and_proximity,
    test_storm_phase_calculation,
    test_user_registration_and_auth,
    test_full_game_and_escrow_loop
)

def run():
    print("========================================")
    print("RUNNING CYSTEM MASTER TEST SUITE")
    print("========================================")
    
    setup_module(None)

    tests = [
        ("Health Check", test_health_check),
        ("Password Security & Rules", test_password_security_rules),
        ("Haversine Distance & Proximity", test_haversine_distance_and_proximity),
        ("Storm Phase & Radius Calculation", test_storm_phase_calculation),
        ("User Registration & Auth Token", test_user_registration_and_auth),
        ("Full Game & Escrow Settlement Loop", test_full_game_and_escrow_loop),
    ]

    passed = 0
    for name, func in tests:
        try:
            func()
            print(f"  ✓ PASS: {name}")
            passed += 1
        except Exception as e:
            print(f"  ✗ FAIL: {name} -> {e}")
            raise e

    print("========================================")
    print(f"ALL {passed}/{len(tests)} TESTS PASSED PERFECTLY! 🚀")
    print("========================================")

if __name__ == "__main__":
    run()

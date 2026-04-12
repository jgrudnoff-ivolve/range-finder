from services import *

def test_line_measure():
    px, _, _ = measure_line(0, 0, 0, 200, 800, 600)
    assert px == 200

def test_focal():
    assert calculate_focal(240, 50, 5) == 2400

def test_distance():
    assert calculate_distance(5, 120, 2400) == 100
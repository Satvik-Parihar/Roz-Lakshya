import joblib, os

model_path = os.path.join('app', 'services', 'priority_model.pkl')
m = joblib.load(model_path)

# (deadline_days, effort, impact, workload)
test_cases = [
    [1, 2, 9, 8],   # very urgent, high impact
    [3, 5, 7, 5],   # urgent, medium impact
    [7, 8, 5, 6],   # normal
    [14, 10, 3, 4], # low impact
    [30, 15, 2, 3], # very low priority
]

MIN = -5.0
MAX = 40.0

print("deadline | effort | impact | workload | raw     | normalized | label")
for d, e, i, w in test_cases:
    raw = float(m.predict([[d, e, i, w]])[0])
    norm = max(0.0, min(100.0, ((raw - MIN) / (MAX - MIN)) * 100))
    label = 'High' if norm >= 70 else 'Medium' if norm >= 28 else 'Low'
    print(f"  {d:>5}d | {e:>5} | {i:>5} | {w:>7} | {raw:>7.2f} | {norm:>9.1f}  | {label}")

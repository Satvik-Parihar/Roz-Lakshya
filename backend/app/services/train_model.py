import os

import joblib
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error
from sklearn.model_selection import train_test_split


def main() -> None:
    services_dir = os.path.dirname(__file__)
    backend_dir = os.path.dirname(os.path.dirname(services_dir))

    csv_path = os.path.join(backend_dir, "TS-PS13.csv")
    model_path = os.path.join(services_dir, "priority_model.pkl")

    df = pd.read_csv(csv_path)

    feature_cols = ["deadline_days", "effort", "impact", "workload"]
    target_col = "priority_score"

    X = df[feature_cols]
    y = df[target_col]

    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=0.2,
        random_state=42,
    )

    model = RandomForestRegressor(
        n_estimators=100,
        random_state=42,
    )
    model.fit(X_train, y_train)

    predictions = model.predict(X_test)
    mae = mean_absolute_error(y_test, predictions)
    print(f"Mean Absolute Error: {mae:.4f}")

    joblib.dump(model, model_path)
    print(f"Saved model to: {model_path}")


if __name__ == "__main__":
    main()
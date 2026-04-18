import os

import joblib
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error
from sklearn.metrics import r2_score
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder


def _fill_priority_label(row: pd.Series) -> str:
    label = row.get("priority_label")
    if pd.notna(label) and str(label).strip() != "":
        return str(label).strip()

    score = float(row.get("priority_score", 0.0))
    if score > 6:
        return "High"
    if score >= 3:
        return "Medium"
    return "Low"


def main() -> None:
    services_dir = os.path.dirname(__file__)
    project_root = os.path.dirname(os.path.dirname(os.path.dirname(services_dir)))

    csv_path = os.path.join(project_root, "TS-PS13_enhanced.csv")
    model_path = os.path.join(services_dir, "priority_model.pkl")
    label_encoder_path = os.path.join(services_dir, "priority_label_encoder.pkl")

    df = pd.read_csv(csv_path)
    df["priority_label"] = df.apply(_fill_priority_label, axis=1)

    feature_cols = ["deadline_days", "effort", "impact", "workload"]
    target_col = "priority_score"

    X = df[feature_cols].astype(float)
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
    r2 = r2_score(y_test, predictions)
    print(f"Mean Absolute Error: {mae:.4f}")
    print(f"R2 Score: {r2:.4f}")

    joblib.dump(model, model_path)
    print(f"Saved model to: {model_path}")

    label_encoder = LabelEncoder()
    label_encoder.fit(df["priority_label"])
    joblib.dump(label_encoder, label_encoder_path)
    print(f"Saved label encoder to: {label_encoder_path}")


if __name__ == "__main__":
    main()
import pandas as pd


DATA_PATH = "dataset/ai4i2020.csv"


def main():
    df = pd.read_csv(DATA_PATH)

    print("\n=== DATASET SHAPE ===")
    print(df.shape)

    print("\n=== COLUMNS ===")
    print(df.columns.tolist())

    print("\n=== FIRST 5 ROWS ===")
    print(df.head())

    print("\n=== DATA TYPES ===")
    print(df.dtypes)

    print("\n=== MISSING VALUES ===")
    print(df.isnull().sum())

    print("\n=== MACHINE FAILURE DISTRIBUTION ===")
    print(df["Machine failure"].value_counts())

    print("\n=== MACHINE FAILURE PERCENTAGE ===")
    print(
        df["Machine failure"]
        .value_counts(normalize=True)
        .mul(100)
    )

    failure_columns = [
        "TWF",
        "HDF",
        "PWF",
        "OSF",
        "RNF",
    ]

    print("\n=== FAILURE TYPE COUNTS ===")

    for column in failure_columns:
        if column in df.columns:
            print(f"{column}: {df[column].sum()}")

    features = [
        "Air temperature [K]",
        "Process temperature [K]",
        "Rotational speed [rpm]",
        "Torque [Nm]",
        "Tool wear [min]",
    ]

    print("\n=== NUMERIC SUMMARY ===")
    print(df[features].describe())


if __name__ == "__main__":
    main()
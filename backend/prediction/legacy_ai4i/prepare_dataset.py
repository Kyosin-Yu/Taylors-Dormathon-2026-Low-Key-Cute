import pandas as pd
from sklearn.model_selection import train_test_split


INPUT_PATH = "dataset/ai4i2020.csv"

FULL_CLEAN_PATH = "dataset/ai4i2020_clean_full.csv"

CLASSIFICATION_PATH = (
    "dataset/ai4i2020_classification_5000.csv"
)


def main():
    # Load original dataset
    df = pd.read_csv(INPUT_PATH)

    print("Original shape:")
    print(df.shape)

    # -----------------------------------------
    # Remove identifier columns
    # -----------------------------------------

    df_clean = df.drop(
        columns=[
            "UDI",
            "Product ID",
        ]
    )

    # Save a clean FULL copy
    df_clean.to_csv(
        FULL_CLEAN_PATH,
        index=False,
    )

    print("\nClean full dataset saved:")
    print(FULL_CLEAN_PATH)

    print("Shape:")
    print(df_clean.shape)

    # -----------------------------------------
    # Create stratified 5000-row subset
    # -----------------------------------------
    #
    # IMPORTANT:
    # We stratify using Machine failure so that
    # the failure ratio stays approximately
    # the same as the original dataset.
    #

    classification_df, _ = train_test_split(
        df_clean,
        train_size=5000,
        random_state=42,
        stratify=df_clean["Machine failure"],
    )

    # Shuffle final ordering
    classification_df = (
        classification_df
        .sample(
            frac=1,
            random_state=42,
        )
        .reset_index(drop=True)
    )

    classification_df.to_csv(
        CLASSIFICATION_PATH,
        index=False,
    )

    print("\nClassification dataset saved:")
    print(CLASSIFICATION_PATH)

    print("\nShape:")
    print(classification_df.shape)

    print("\nFailure distribution:")
    print(
        classification_df[
            "Machine failure"
        ].value_counts()
    )

    print("\nFailure percentage:")
    print(
        classification_df[
            "Machine failure"
        ]
        .value_counts(normalize=True)
        .mul(100)
    )

    print("\nColumns:")
    print(
        classification_df.columns.tolist()
    )


if __name__ == "__main__":
    main()
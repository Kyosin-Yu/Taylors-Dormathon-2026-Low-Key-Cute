import streamlit as st
import requests

API_URL = "http://127.0.0.1:8000/predict"

st.set_page_config(
    page_title="Team Lowkey Cute",
    layout="centered"
)

st.title("Team Lowkey Cute")
st.subheader("Predictive Decision Support Prototype")

st.write(
    "This is a domain-agnostic prototype used to test the prediction pipeline."
)

st.divider()

st.subheader("Input Data")

feature_1 = st.number_input("Feature 1", value=80.0)
feature_2 = st.number_input("Feature 2", value=75.0)
feature_3 = st.number_input("Feature 3", value=90.0)
feature_4 = st.number_input("Feature 4", value=70.0)


if st.button("Run Prediction"):
    payload = {
        "values": [
            feature_1,
            feature_2,
            feature_3,
            feature_4
        ]
    }

    try:
        response = requests.post(
            API_URL,
            json=payload,
            timeout=10
        )

        response.raise_for_status()
        result = response.json()
        st.divider()
        st.subheader("Prediction Result")
        prediction = result["prediction"]
        st.metric(
            label="Risk Level",
            value=prediction["label"],
            delta=f'{prediction["score"] * 100:.0f}% score'
        )

        st.subheader("Explanation")
        st.write(
            result["explanation"]
        )
        st.subheader("Recommendations")
        for index, recommendation in enumerate(
            result["recommendations"],
            start=1
        ):
            st.write(
                f"{index}. {recommendation}"
            )
    except requests.exceptions.ConnectionError:
        st.error(
            "Unable to connect to the FastAPI backend. "
            "Make sure the backend is running on port 8000."
        )
    except requests.exceptions.Timeout:
        st.error(
            "The prediction request timed out."
        )
    except Exception as error:
        st.error(
            f"Something went wrong: {error}"
        )
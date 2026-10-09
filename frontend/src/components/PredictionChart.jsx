import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

function PredictionChart({ score }) {
  if (score === undefined || score === null) {
    return null;
  }

  const percentage = score * 100;

  const data = [
    {
      name: "Prediction Score",
      value: percentage,
    },
  ];

  return (
    <div
      style={{
        marginTop: "25px",
        marginBottom: "40px",
      }}
    >
      <h3>Prediction Visualization</h3>

      <div
  style={{
    width: "500px",
    maxWidth: "100%",
    height: "220px",
    margin: "0 auto",
  }}
>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{
              top: 20,
              right: 30,
              left: 10,
              bottom: 20,
            }}
          >
            <XAxis
              dataKey="name"
              tick={{ fill: "#cbd5e1" }}
            />

            <YAxis
              domain={[0, 100]}
              tick={{ fill: "#cbd5e1" }}
            />

            <Tooltip />

            <Bar
              dataKey="value"
              fill="#2563eb"
              radius={[8, 8, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default PredictionChart;
import Cylinder from "../components/Cylinder";
import "../css/style.css";

function Dashboard() {
  return (
    <div className="dashboard-wrapper">
      <div style={{ width: "100%", textAlign: "center", paddingTop: "20px", marginBottom: "40px" }}>
        <h1 className="todays">TODAYS MOST PICK</h1>
      </div>
      <Cylinder />
    </div>
  );
}

export default Dashboard;
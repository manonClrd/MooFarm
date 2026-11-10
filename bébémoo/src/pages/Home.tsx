import { useEffect, useState } from "react";
import "../css/Home.css";

type Farm = {
  farm_id: number;
  name: string;
};


export default function Home() {
  const [farms, setFarms] = useState<Farm[]>([]);
  const [selectedFarm, setSelectedFarm] = useState("");

  useEffect(() => {
    fetch("http://localhost:3000/farm")
      .then((res) => res.json())
      .then((data) => setFarms(data))
      .catch((err) => console.error("Error fetching farms:", err));
  }, []);

  return (
    <div className="home-container">
      <header className="header">
        <div className="auth-buttons">
          <button className="btn">Sign in</button>
          <button className="btn btn-outline">Sign up</button>
        </div>
      </header>

      <main className="main">
        <h1 className="title">Welcome to MooFarm</h1>

        <div className="search-box">
          <select
            value={selectedFarm}
            onChange={(e) => setSelectedFarm(e.target.value)}
          >
            <option value="">Select a farm...</option>
            {farms.map((farm) => (
              <option key={farm.farm_id} value={farm.farm_id}>
                {farm.name}
              </option>
            ))}
          </select>
        </div>
      </main>
    </div>
  );
}




import React from "react";
import SessionManagement from "./SessionManagement";
import UploadServiceConfig from "./UploadServiceConfig";
import BlastResults from "../Blast/BlastResults"; // NEW: Import BlastResults

const Dashboard = () => {
  return (
    <>
      <SessionManagement />

      {/* NEW: Add Blast Results with Retry Feature */}
      <BlastResults />

      <UploadServiceConfig />
    </>
  );
};

export default Dashboard;

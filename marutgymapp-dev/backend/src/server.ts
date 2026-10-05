import express, { Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";

import authRoutes from "./routes/authRoutes";
import memberRoutes from "./routes/memberRoutes";
import membershipRoutes from "./routes/membershipRoutes";
import attendanceRoutes from "./routes/attendanceRoutes";
import financeRoutes from "./routes/financeRoutes";
import reportRoutes from "./routes/reportRoutes";
import customFieldRoutes from "./routes/customFieldRoutes";
import batchRoutes from "./routes/batchRoutes";
import staffRoutes from "./routes/staffRoutes";
import tenantRoutes from "./routes/tenantRoutes";
import integrationRoutes from "./routes/integrationRoutes";
import iclockRoutes from "./routes/iclockRoutes";
import leadRoutes from "./routes/leadRoutes";
import publicRoutes from "./routes/publicRoutes";
import competitionRoutes from "./routes/competitionRoutes";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: "*", credentials: true }));
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Health Check
app.get("/health", (req: Request, res: Response) => {
  res.json({ status: "OK", service: "Marut Fitness Software Backend API Server", timestamp: new Date() });
});

// REST API Routers
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1", competitionRoutes);
app.use("/api/v1/tenants", tenantRoutes);
app.use("/api/v1/members", memberRoutes);
app.use("/api/v1/memberships", membershipRoutes);
app.use("/api/v1/batches", batchRoutes);
app.use("/api/v1/staff", staffRoutes);
app.use("/api/v1/attendance", attendanceRoutes);
app.use("/api/v1/integrations", integrationRoutes);
app.use("/api/v1/leads", leadRoutes);
app.use("/api/v1/finance", financeRoutes);
app.use("/api/v1/reports", reportRoutes);
app.use("/api/v1/custom-fields", customFieldRoutes);
app.use("/api/v1/public", publicRoutes);

// ZKTeco ADMS Device Routes (Handles plain text payloads)
app.use("/iclock", express.text({ type: "*/*" }), iclockRoutes);

// Start API Server
const HOST = process.env.HOST || "0.0.0.0";
app.listen(Number(PORT), HOST, () => {
  console.log(`🚀 Backend API Server running at http://${HOST}:${PORT}`);
});

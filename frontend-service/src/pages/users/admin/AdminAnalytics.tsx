import { useEffect, useState, useRef } from "react";
import axios from "axios";
import AdminLayout from "./AdminLayout";
import { Bar, Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  DoughnutController,
} from "chart.js";
import { Users, ShieldCheck, AlertCircle, FileDown } from "lucide-react";
import { userUrl } from "../../../api";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// 👇 Your logo (adjust the path if needed)
import logo from "../../../assets/Logo.png";

// Extend jsPDF
declare module "jspdf" {
  interface jsPDF {
    lastAutoTable: {
      finalY: number;
    };
  }
}

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  DoughnutController
);

type User = {
  role: string;
  isApproved: boolean;
  createdAt: string;
};

const AdminAnalytics = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const signupChartRef = useRef<any>(null);
  const roleChartRef = useRef<any>(null);
  const approvalTrendRef = useRef<any>(null);
  const approvalStatusRef = useRef<any>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(`${userUrl}/api/auth/all`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const onlyUsers = res.data.filter((user: User) =>
          ["customer", "restaurantAdmin", "deliveryPersonnel"].includes(user.role)
        );
        setUsers(onlyUsers);
      } catch (err) {
        console.error("Failed to fetch users");
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  const roleCounts = users.reduce((acc, user) => {
    acc[user.role] = (acc[user.role] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const approvalCounts = users.reduce((acc, user) => {
    const key = user.isApproved ? "Approved" : "Pending";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const monthlySignups = users.reduce((acc, user) => {
    const month = user.createdAt?.slice(0, 7);
    acc[month] = (acc[month] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const monthlyApprovalStats = users.reduce((acc, user) => {
    const month = user.createdAt?.slice(0, 7);
    if (!acc[month]) acc[month] = { Approved: 0, Pending: 0 };
    user.isApproved ? acc[month].Approved++ : acc[month].Pending++;
    return acc;
  }, {} as Record<string, { Approved: number; Pending: number }>);

  const barData = {
    labels: Object.keys(monthlySignups),
    datasets: [
      {
        label: "User Signups",
        data: Object.values(monthlySignups),
        backgroundColor: "#6366f1",
        borderRadius: 6,
        barThickness: 100,
      },
    ],
  };

  const doughnutData = {
    labels: Object.keys(roleCounts),
    datasets: [
      {
        label: "Roles",
        data: Object.values(roleCounts),
        backgroundColor: ["#22c55e", "#f97316", "#3b82f6"],
      },
    ],
  };

  const approvalBarData = {
    labels: Object.keys(monthlyApprovalStats),
    datasets: [
      {
        label: "Approved",
        data: Object.values(monthlyApprovalStats).map((m) => m.Approved),
        backgroundColor: "#10b981",
        borderRadius: 6,
      },
      {
        label: "Pending",
        data: Object.values(monthlyApprovalStats).map((m) => m.Pending),
        backgroundColor: "#facc15",
        borderRadius: 6,
      },
    ],
  };

  const approvalPieData = {
    labels: ["Approved", "Pending"],
    datasets: [
      {
        data: [approvalCounts["Approved"] || 0, approvalCounts["Pending"] || 0],
        backgroundColor: ["#16a34a", "#fbbf24"],
      },
    ],
  };

  const generateReport = async () => {
    const doc = new jsPDF();
    const now = new Date();
    const formattedDate = now.toLocaleDateString();
    const formattedTime = now.toLocaleTimeString();
    const reportId = `UA-${now.getFullYear()}${now.getMonth() + 1}${now.getDate()}${now.getHours()}${now.getMinutes()}`;

    const pageWidth = doc.internal.pageSize.getWidth();

    // Logo and Title
    doc.addImage(logo, "PNG", 14, 10, 30, 30);
    doc.setFontSize(18);
    doc.text("User Analytics Report", pageWidth / 2, 20, { align: "center" });
    doc.setFontSize(11);
    doc.text(`Generated On: ${formattedDate} at ${formattedTime}`, 14, 45);
    doc.text(`Report ID: ${reportId}`, 14, 51);

    // Tables
    doc.setFontSize(14);
    doc.text("Summary", 14, 65);

    autoTable(doc, {
      startY: 70,
      head: [["Category", "Value"]],
      body: [
        ["Total Users", users.length.toString()],
        ["Approved Users", (approvalCounts["Approved"] || 0).toString()],
        ["Pending Users", (approvalCounts["Pending"] || 0).toString()],
      ],
    });

    const roleTableData = Object.entries(roleCounts).map(([role, count]) => [role, count.toString()]);

    doc.setFontSize(14);
    doc.text("Role Breakdown", 14, (doc as any).lastAutoTable.finalY + 10);

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 14,
      head: [["Role", "Count"]],
      body: roleTableData,
    });

    const signupTableData = Object.entries(monthlySignups).map(([month, count]) => [month, count.toString()]);

    doc.setFontSize(14);
    doc.text("Signup Overview", 14, (doc as any).lastAutoTable.finalY + 10);

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 14,
      head: [["Month", "Signups"]],
      body: signupTableData,
    });

    // Graphs
    doc.addPage();
    doc.setFontSize(16);
    doc.text("Graphs Overview", pageWidth / 2, 20, { align: "center" });

    const signupImg = signupChartRef.current?.toBase64Image();
    const roleImg = roleChartRef.current?.toBase64Image();
    const approvalTrendImg = approvalTrendRef.current?.toBase64Image();
    const approvalStatusImg = approvalStatusRef.current?.toBase64Image();

    const graphWidth = 90;
    const graphHeight = 70;
    const marginX = 15;
    const marginY = 30;

    if (signupImg) doc.addImage(signupImg, "PNG", marginX, marginY, graphWidth, graphHeight);
    if (roleImg) doc.addImage(roleImg, "PNG", marginX + graphWidth + 10, marginY, graphWidth, graphHeight);
    if (approvalTrendImg) doc.addImage(approvalTrendImg, "PNG", marginX, marginY + graphHeight + 20, graphWidth, graphHeight);
    if (approvalStatusImg) doc.addImage(approvalStatusImg, "PNG", marginX + graphWidth + 10, marginY + graphHeight + 20, graphWidth, graphHeight);

    doc.save(`User_Analytics_Report_${now.toISOString().slice(0, 10)}.pdf`);
  };

  return (
    <AdminLayout>
      <div className="p-6 font-['Inter']">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white">
            User Analytics
          </h1>
          <button
            onClick={generateReport}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-semibold"
          >
            <FileDown size={18} /> Download Report
          </button>
        </div>

        {loading ? (
          <p className="text-gray-600 dark:text-gray-300">Loading data...</p>
        ) : (
          <>
            {/* Graphs */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="col-span-1 bg-white dark:bg-neutral-800 p-6 rounded-xl shadow">
                <h2 className="text-lg font-semibold mb-4 text-gray-700 dark:text-gray-200">
                  User Signups Over Time
                </h2>
                <Bar ref={signupChartRef} data={barData} height={140} />
              </div>

              <div className="col-span-1 bg-white dark:bg-neutral-800 p-6 rounded-xl shadow">
                <h2 className="text-lg font-semibold mb-4 text-gray-700 dark:text-gray-200">
                  User Role Distribution
                </h2>
                <Doughnut ref={roleChartRef} data={doughnutData} />
              </div>

              <div className="col-span-1 bg-white dark:bg-neutral-800 p-6 rounded-xl shadow">
                <h2 className="text-lg font-semibold mb-4 text-gray-700 dark:text-gray-200">
                  Approval Trends
                </h2>
                <Bar ref={approvalTrendRef} data={approvalBarData} height={140} />
              </div>

              <div className="col-span-1 bg-white dark:bg-neutral-800 p-6 rounded-xl shadow">
                <h2 className="text-lg font-semibold mb-4 text-gray-700 dark:text-gray-200">
                  Approval Status Ratio
                </h2>
                <Doughnut ref={approvalStatusRef} data={approvalPieData} />
              </div>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminAnalytics;

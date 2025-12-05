import { useEffect, useState } from "react";
import axios from "axios";
import AdminLayout from "../AdminLayout";
import { CheckCircle, Trash2, Search, Filter, Download } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { userUrl } from "../../../../api";

// Import logo (adjust path if needed)
import logo from "../../../../assets/Logo.png";

// Extend jsPDF
declare module "jspdf" {
  interface jsPDF {
    lastAutoTable: {
      finalY: number;
    };
  }
}

type RestaurantAdmin = {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  isApproved?: boolean;
  role?: string;
};

const AdminRestaurant = () => {
  const [restaurantAdmins, setRestaurantAdmins] = useState<RestaurantAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [approvalFilter, setApprovalFilter] = useState<"all" | "approved" | "pending">("all");

  const fetchRestaurantAdmins = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${userUrl}/api/auth/all`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const filtered = res.data.filter(
        (user: RestaurantAdmin) => user.role === "restaurantAdmin"
      );
      setRestaurantAdmins(filtered);
    } catch (err: any) {
      console.error("Failed to fetch restaurant admins:", err);
      setError("Failed to load restaurant admin data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRestaurantAdmins();
  }, []);

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this restaurant admin?")) return;
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${userUrl}/api/auth/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setRestaurantAdmins((prev) => prev.filter((admin) => admin._id !== id));
    } catch {
      alert("Failed to delete user");
    }
  };

  const handleApprove = async (id: string) => {
    if (!window.confirm("Approve this restaurant admin?")) return;
    try {
      const token = localStorage.getItem("token");
      await axios.put(
        `${userUrl}/api/auth/${id}`,
        { isApproved: true },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setRestaurantAdmins((prev) =>
        prev.map((admin) =>
          admin._id === id ? { ...admin, isApproved: true } : admin
        )
      );
    } catch {
      alert("Failed to approve user");
    }
  };

  const filteredAdmins = restaurantAdmins
    .filter(
      (admin) =>
        admin.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        admin.email?.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .filter((admin) => {
      if (approvalFilter === "approved") return admin.isApproved;
      if (approvalFilter === "pending") return !admin.isApproved;
      return true;
    });

  const generatePDF = () => {
    const doc = new jsPDF();
    const now = new Date();
    const formattedDate = now.toLocaleDateString();
    const formattedTime = now.toLocaleTimeString();
    const reportId = `RA-${now.getFullYear()}${now.getMonth() + 1}${now.getDate()}${now.getHours()}${now.getMinutes()}`;

    const pageWidth = doc.internal.pageSize.getWidth();

    // Logo
    doc.addImage(logo, "PNG", 14, 10, 30, 30);

    // Title and details
    doc.setFontSize(18);
    doc.text("HungerJet Restaurant Admins Report", pageWidth / 2, 20, { align: "center" });

    doc.setFontSize(11);
    doc.text(`Generated On: ${formattedDate} at ${formattedTime}`, 14, 45);
    doc.text(`Report ID: ${reportId}`, 14, 51);

    // Table
    autoTable(doc, {
      startY: 60,
      head: [["No", "Name", "Email", "Phone", "Address", "Approved"]],
      body: filteredAdmins.map((admin, i) => [
        i + 1,
        admin.name || "-",
        admin.email || "-",
        admin.phone || "-",
        admin.address || "-",
        admin.isApproved ? "Yes" : "No",
      ]),
    });

    // Footer
    const pageHeight = doc.internal.pageSize.height;
    doc.setFontSize(10);
    doc.text("Admin: John Doe", 14, pageHeight - 20);
    doc.text("Signature: ___________________", pageWidth - 80, pageHeight - 20);

    doc.save(`Restaurant_Admins_Report_${now.toISOString().slice(0, 10)}.pdf`);
  };

  return (
    <AdminLayout>
      <div className="p-6 font-['Inter'] text-gray-800 dark:text-gray-100">
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
          <h1 className="text-4xl font-extrabold">All Restaurant Admins</h1>

          <div className="flex gap-3 items-center w-full md:w-auto">
            <div className="relative w-full md:w-64">
              <Search
                className="absolute left-3 top-3 text-gray-400 dark:text-gray-500"
                size={18}
              />
              <input
                type="text"
                placeholder="Search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-full shadow-sm focus:ring-2 focus:ring-indigo-500 w-full"
              />
            </div>

            <div className="relative">
              <Filter
                className="absolute left-3 top-3 text-gray-400 dark:text-gray-500"
                size={18}
              />
              <select
                value={approvalFilter}
                onChange={(e) => setApprovalFilter(e.target.value as any)}
                className="pl-10 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-full shadow-sm focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">All</option>
                <option value="approved">Approved</option>
                <option value="pending">Pending</option>
              </select>
            </div>

            <button
              onClick={generatePDF}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 transition"
            >
              <Download size={16} />
              Download Report
            </button>
          </div>
        </div>

        {loading ? (
          <p>Loading restaurant admins...</p>
        ) : error ? (
          <p className="text-red-500">{error}</p>
        ) : (
          <div className="rounded-xl bg-white dark:bg-gray-800 shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden">
            <table className="min-w-full table-auto text-sm">
              <thead className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 uppercase text-xs">
                <tr>
                  <th className="px-6 py-3 text-left">No</th>
                  <th className="px-6 py-3 text-left">Name</th>
                  <th className="px-6 py-3 text-left">Email</th>
                  <th className="px-6 py-3 text-left">Phone</th>
                  <th className="px-6 py-3 text-left">Address</th>
                  <th className="px-6 py-3 text-left">Approved</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                {filteredAdmins.map((admin, index) => (
                  <tr key={admin._id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-3">{index + 1}</td>
                    <td className="px-6 py-3">{admin.name || "-"}</td>
                    <td className="px-6 py-3">{admin.email || "-"}</td>
                    <td className="px-6 py-3">{admin.phone || "-"}</td>
                    <td className="px-6 py-3">{admin.address || "-"}</td>
                    <td className="px-6 py-3">
                      {admin.isApproved ? (
                        <CheckCircle className="text-green-500" size={20} />
                      ) : (
                        <button
                          onClick={() => handleApprove(admin._id)}
                          className="bg-yellow-100 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-100 px-3 py-1 rounded-full text-xs hover:bg-yellow-200 dark:hover:bg-yellow-700"
                        >
                          Pending
                        </button>
                      )}
                    </td>
                    <td className="px-6 py-3 text-right">
                      <button
                        onClick={() => handleDelete(admin._id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredAdmins.length === 0 && (
              <p className="p-6 text-center text-gray-500 dark:text-gray-400">
                No restaurant admins found.
              </p>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminRestaurant;

import { useState } from "react";
import {
  LayoutDashboard,
  Users,
  BookOpen,
  Calendar,
  FileText,
  Settings,
  Menu,
  X,
} from "lucide-react";

export default function App() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "students", label: "Students", icon: Users },
    { id: "teachers", label: "Teachers", icon: BookOpen },
    { id: "timetable", label: "Timetable", icon: Calendar },
    { id: "reports", label: "Reports", icon: FileText },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return <div className="text-white text-xl">Dashboard</div>;
      case "students":
        return <div className="text-white text-xl">Students</div>;
      case "teachers":
        return <div className="text-white text-xl">Teachers</div>;
      case "timetable":
        return <div className="text-white text-xl">Timetable</div>;
      case "reports":
        return <div className="text-white text-xl">Reports</div>;
      case "settings":
        return <div className="text-white text-xl">Settings</div>;
      default:
        return null;
    }
  };

  return (
    <div className="flex min-h-screen bg-[#0B0E17] text-white">

      {/* MOBILE TOP BAR */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-[#0B0E17] border-b border-white/10 flex items-center px-4 z-40">
        <button onClick={() => setMobileMenuOpen(true)}>
          <Menu className="w-6 h-6" />
        </button>
        <div className="ml-3 font-semibold">SchoolOps AI</div>
      </div>

      {/* OVERLAY */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* SIDEBAR */}
      <aside
        className={`
          fixed md:static z-50
          w-[260px] md:w-[248px]
          h-full md:h-screen
          bg-[#0B0E17] border-r border-white/5
          flex flex-col justify-between
          transform transition-transform duration-300
          ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        `}
      >
        {/* HEADER */}
        <div>
          <div className="p-5 font-bold text-lg border-b border-white/10 flex justify-between items-center">
            SchoolOps AI

            <button
              className="md:hidden"
              onClick={() => setMobileMenuOpen(false)}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* NAV */}
          <nav className="mt-6 space-y-2 px-3">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition
                    ${
                      activeTab === item.id
                        ? "bg-white/10"
                        : "hover:bg-white/5"
                    }
                  `}
                >
                  <Icon className="w-5 h-5" />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* FOOTER */}
        <div className="p-4 text-xs text-white/40 border-t border-white/10">
          SchoolOps AI v1.0
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 w-full min-h-screen md:ml-[248px] pt-16 md:pt-0 p-4 md:p-8">
        {renderContent()}
      </main>
    </div>
  );
}
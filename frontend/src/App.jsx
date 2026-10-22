import { BrowserRouter, Routes, Route } from "react-router-dom";

import Sidebar from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";
import Students from "./pages/Students";
import Attendance from "./pages/Attendance";
import Fees from "./pages/Fees";
import BeltGrades from "./pages/BeltGrades";
import Competitions from "./pages/Competitions";
import Reports from "./pages/Reports";
import Login from "./pages/Login";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminManagement from "./pages/AdminManagement";
import UserManagement from "./pages/UserManagement";
import Results from "./pages/Results";
import Settings from "./pages/Settings";
import RoleHome from "./pages/RoleHome";
import BranchDashboard from "./pages/BranchDashboard";
import ParentDashboard from "./pages/ParentDashboard";
import ParentLogin from "./pages/ParentLogin";
import Messages from "./pages/Messages";


function ModulePage({ title, subtitle, icon }) {
    return (
        <div className="module-page">

            <div className="module-icon">
                {icon}
            </div>

            <h1>{title}</h1>

            <p>{subtitle}</p>

            <div className="module-coming">
                <span>
                    Module in development
                </span>
            </div>

        </div>
    );
}


/*
 * Main Academy Layout
 *
 * Sidebar is displayed only for the
 * actual academy management pages.
 */
function AcademyLayout() {
    return (
        <div className="app-shell">

            <Sidebar />

            <main className="main-content">

                <Routes>

                    <Route
                        path="/parent-dashboard"
                        element={<ParentDashboard />}
                    />



                    <Route
                        path="/branch-dashboard"
                        element={<BranchDashboard />}
                    />



                    <Route
                        path="/user-management"
                        element={
                            <UserManagement />
                        }
                    />



                    {/* Dashboard */}

                    <Route
                        path="/"
                        element={<RoleHome />}
                    />


                    {/* Students */}

                    <Route
                        path="/students"
                        element={<Students />}
                    />


                    {/* Attendance */}

                    <Route
                        path="/attendance"
                        element={<Attendance />}
                    />


                    {/* Fees */}

                    <Route
                        path="/fees"
                        element={<Fees />}
                    />


                    {/* Belt / Grade */}

                    <Route
                        path="/belts"
                        element={<BeltGrades /> }
                    />


                    {/* Competitions */}

                    <Route
                        path="/competitions"
                        element={<Competitions/>}
                    />


                    {/* Results */}

                    <Route
                        path="/results"
                        element={<Results /> }
                    />


                    {/* Reports */}

                    <Route
                        path="/admin-management"
                        element={<AdminManagement />}
                    />

                    <Route
                        path="/reports"
                        element={ < Reports />  }
                    />

		   {/* Settings */}
	    	   
	    	  <Route
  			  path="/settings"
   			 element={<Settings />}
			/>

                
                <Route path="/messages" element={<Messages />} />


                
                <Route
                    path="/parent-login"
                    element={<ParentLogin />}
                />

                <Route
                    path="/parent-dashboard"
                    element={<ParentDashboard />}
                />

</Routes>

            </main>

        </div>
    );
}


function App() {
    return (
        <BrowserRouter>
            <Routes>

                {/* PUBLIC PAGE */}
                <Route
                    path="/login"
                    element={<Login />}
                />

                {/* ALL OTHER PAGES REQUIRE LOGIN */}
                <Route
                    path="*"
                    element={
                        <ProtectedRoute>
                            <AcademyLayout />
                        </ProtectedRoute>
                    }
                />

            </Routes>
        </BrowserRouter>
    );
}


export default App;

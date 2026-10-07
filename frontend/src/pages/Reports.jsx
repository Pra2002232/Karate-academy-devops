import { useState } from "react";
import api from "../services/api";
import "./Reports.css";

function Reports() {

    const [reportType, setReportType] = useState("students");

    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");

    const [batch, setBatch] = useState("");
    const [status, setStatus] = useState("");

    const [loading, setLoading] = useState(false);
    const [reportData, setReportData] = useState([]);

    const reportTitles = {
        students: "Student Report",
        attendance: "Attendance Report",
        fees: "Fees Report",
        belts: "Belt & Grading Report",
        competitions: "Competition Report",
        results: "Results & Winners Report"
    };

    const generateReport = async () => {

        try {

            setLoading(true);

            if (
                fromDate &&
                toDate &&
                fromDate > toDate
            ) {

                alert(
                    "From Date cannot be later than To Date."
                );

                setLoading(false);

                return;

            }

            let endpoint = "";

            switch (reportType) {

                case "students":
                    endpoint = "/reporting/students";
                    break;

                case "attendance":
                    endpoint = "/reporting/attendance";
                    break;

                case "fees":
                    endpoint = "/reporting/fees";
                    break;

                case "belts":
                    endpoint = "/reporting/belts";
                    break;

                case "competitions":
                    endpoint = "/reporting/competitions";
                    break;

                case "results":
                    endpoint = "/reporting/results";
                    break;

                default:
                    endpoint = "/reporting/students";
            }

            const response = await api.get(endpoint, {
                params: {
                    from_date: fromDate,
                    to_date: toDate,
                    batch,
                    status
                }
            });

            setReportData(
                Array.isArray(response.data)
                    ? response.data
                    : Array.isArray(response.data?.data)
                        ? response.data.data
                        : []
            );

        } catch (error) {

            console.error("Report error:", error);

            alert(
                error.response?.data?.message ||
                "Unable to generate report."
            );

        } finally {

            setLoading(false);

        }

    };


    const clearFilters = () => {

        setFromDate("");
        setToDate("");
        setBatch("");
        setStatus("");
        setReportData([]);

    };


    const exportCSV = () => {

        if (!reportData.length) {
            alert("Generate a report first.");
            return;
        }

        const headers =
            Object.keys(reportData[0]);

        const rows =
            reportData.map(row =>
                headers.map(header => {

                    const value =
                        row[header] ?? "";

                    return `"${String(value)
                        .replace(/"/g, '""')}"`;

                }).join(",")
            );

        const csv =
            [headers.join(","), ...rows].join("\n");

        const blob =
            new Blob([csv], {
                type: "text/csv;charset=utf-8;"
            });

        const url =
            URL.createObjectURL(blob);

        const link =
            document.createElement("a");

        link.href = url;

        link.download =
            `${reportType}-report.csv`;

        link.click();

        URL.revokeObjectURL(url);

    };


    return (

        <div className="reports-page">

            {/* HEADER */}

            <div className="reports-header">

                <div>

                    <div className="reports-title-row">

                        <div className="reports-icon">
                            📊
                        </div>

                        <div>

                            <h1>
                                Reports
                            </h1>

                            <p>
                                Generate detailed academy reports.
                            </p>

                        </div>

                    </div>

                </div>

            </div>


            {/* REPORT TYPE */}

            <div className="reports-card">

                <div className="reports-card-header">

                    <div>

                        <h2>
                            Report Type
                        </h2>

                        <span>
                            Select the report you want to generate.
                        </span>

                    </div>

                </div>


                <div className="report-types">

                    <button
                        className={
                            reportType === "students"
                                ? "report-type active"
                                : "report-type"
                        }
                        onClick={() => setReportType("students")}
                    >
                        👨‍🎓
                        <span>
                            Student Report
                        </span>
                    </button>


                    <button
                        className={
                            reportType === "attendance"
                                ? "report-type active"
                                : "report-type"
                        }
                        onClick={() => setReportType("attendance")}
                    >
                        📅
                        <span>
                            Attendance
                        </span>
                    </button>


                    <button
                        className={
                            reportType === "fees"
                                ? "report-type active"
                                : "report-type"
                        }
                        onClick={() => setReportType("fees")}
                    >
                        💰
                        <span>
                            Fees
                        </span>
                    </button>


                    <button
                        className={
                            reportType === "belts"
                                ? "report-type active"
                                : "report-type"
                        }
                        onClick={() => setReportType("belts")}
                    >
                        🥋
                        <span>
                            Belt & Grading
                        </span>
                    </button>


                    <button
                        className={
                            reportType === "competitions"
                                ? "report-type active"
                                : "report-type"
                        }
                        onClick={() => setReportType("competitions")}
                    >
                        🏆
                        <span>
                            Competitions
                        </span>
                    </button>


                    <button
                        className={
                            reportType === "results"
                                ? "report-type active"
                                : "report-type"
                        }
                        onClick={() => setReportType("results")}
                    >
                        🥇
                        <span>
                            Results & Winners
                        </span>
                    </button>

                </div>

            </div>


            {/* FILTERS */}

            <div className="reports-card">

                <div className="reports-card-header">

                    <div>

                        <h2>
                            {reportTitles[reportType]}
                        </h2>

                        <span>
                            Apply filters before generating the report. Branch access is automatic.
                        </span>

                    </div>

                </div>


                <div className="report-filters">

                    <div className="report-field">

                        <label>
                            From Date
                        </label>

                        <input
                            type="date"
                            value={fromDate}
                            onChange={e =>
                                setFromDate(e.target.value)
                            }
                        />

                    </div>


                    <div className="report-field">

                        <label>
                            To Date
                        </label>

                        <input
                            type="date"
                            value={toDate}
                            onChange={e =>
                                setToDate(e.target.value)
                            }
                        />

                    </div>


                    <div className="report-field">

                        <label>
                            Batch
                        </label>

                        <input
                            type="text"
                            placeholder="e.g. Morning"
                            value={batch}
                            onChange={e =>
                                setBatch(e.target.value)
                            }
                        />

                    </div>


                    <div className="report-field">

                        <label>
                            Status
                        </label>

                        <select
                            value={status}
                            onChange={e =>
                                setStatus(e.target.value)
                            }
                        >

                            <option value="">
                                All
                            </option>

                            <option value="ACTIVE">
                                Active
                            </option>

                            <option value="INACTIVE">
                                Inactive
                            </option>

                        </select>

                    </div>

                </div>


                <div className="report-actions">

                    <button
                        className="report-generate"
                        onClick={generateReport}
                        disabled={loading}
                    >

                        {loading
                            ? "Generating..."
                            : "Generate Report"}

                    </button>


                    <button
                        className="report-clear"
                        onClick={clearFilters}
                    >
                        Clear
                    </button>

                </div>

            </div>


            {/* RESULT */}

            <div className="reports-card">

                <div className="reports-card-header">

                    <div>

                        <h2>
                            Report Results
                        </h2>

                        <span>
                            {reportData.length}
                            {" "}
                            records found
                        </span>

                    </div>


                    {reportData.length > 0 && (

                        <button
                            className="report-export"
                            onClick={exportCSV}
                        >
                            ↓ Export CSV
                        </button>

                    )}

                </div>


                {reportData.length === 0 ? (

                    <div className="report-empty">

                        <div className="report-empty-icon">
                            📄
                        </div>

                        <strong>
                            No report generated
                        </strong>

                        <span>
                            Select a report type and click
                            "Generate Report".
                        </span>

                    </div>

                ) : (

                    <div className="report-table-wrapper">

                        <table className="report-table">

                            <thead>

                                <tr>

                                    {Object.keys(reportData[0] || { }).map(column => (

                                        <th key={column}>
                                            {column
                                                .replaceAll("_", " ")
                                                .toUpperCase()}
                                        </th>

                                    ))}

                                </tr>

                            </thead>


                            <tbody>

                                {reportData.map(
                                    (row, index) => (

                                        <tr key={index}>

                                            {Object.keys(reportData[0] || {} ).map(column => (

                                                <td key={column}>

                                                    {row[column] ??
                                                        "-"}

                                                </td>

                                            ))}

                                        </tr>

                                    )
                                )}

                            </tbody>

                        </table>

                    </div>

                )}

            </div>

        </div>

    );

}

export default Reports;

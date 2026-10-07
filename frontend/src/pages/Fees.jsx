import { useEffect, useState } from "react";
import api from "../services/api";
import "./Fees.css";

function Fees() {

    const [fees, setFees] = useState([]);
    const [students, setStudents] = useState([]);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [showForm, setShowForm] = useState(false);

    const [form, setForm] = useState({
        student_id: "",
        fee_type: "MONTHLY",
        description: "",
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear(),
        amount: "",
        due_date: "",
        status: "PENDING",
        payment_reference: ""
    });

    // ==========================================
    // LOAD DATA
    // ==========================================

    useEffect(() => {
        loadStudents();
        loadFees();
    }, []);

    const loadStudents = async () => {

        try {

            const response =
                await api.get("/students");

            setStudents(
                response.data.students || []
            );

        } catch (error) {

            console.error(
                "Students API Error:",
                error
            );

        }
    };


    const loadFees = async () => {

        try {

            setLoading(true);

            const response =
                await api.get("/fees");

            setFees(
                response.data.fees || []
            );

        } catch (error) {

            console.error(
                "Fees API Error:",
                error
            );

        } finally {

            setLoading(false);

        }
    };


    // ==========================================
    // FORM CHANGE
    // ==========================================

    const handleChange = (event) => {

        const {
            name,
            value
        } = event.target;

        setForm(prev => ({
            ...prev,
            [name]: value
        }));

    };


    // ==========================================
    // FEE TYPE CHANGE
    // ==========================================

    const handleFeeTypeChange = (event) => {

        const feeType = event.target.value;

        setForm(prev => ({
            ...prev,
            fee_type: feeType,
            month:
                feeType === "MONTHLY"
                    ? new Date().getMonth() + 1
                    : "",
            year:
                feeType === "MONTHLY"
                    ? new Date().getFullYear()
                    : ""
        }));

    };


    // ==========================================
    // SAVE FEE
    // ==========================================

    const handleSubmit = async (event) => {

        event.preventDefault();

        if (!form.student_id) {
            alert("Please select a student.");
            return;
        }

        if (!form.amount) {
            alert("Please enter the fee amount.");
            return;
        }

        try {

            setSaving(true);

            await api.post("/fees", {
                ...form,
                student_id: Number(form.student_id),
                amount: Number(form.amount),
                month:
                    form.fee_type === "MONTHLY"
                        ? Number(form.month)
                        : null,
                year:
                    form.fee_type === "MONTHLY"
                        ? Number(form.year)
                        : null
            });

            alert("Fee added successfully.");

            setForm({
                student_id: "",
                fee_type: "MONTHLY",
                description: "",
                month: new Date().getMonth() + 1,
                year: new Date().getFullYear(),
                amount: "",
                due_date: "",
                status: "PENDING",
                payment_reference: ""
            });

            setShowForm(false);

            await loadFees();

        } catch (error) {

            console.error(
                "Create Fee Error:",
                error
            );

            alert(
                error.response?.data?.message ||
                "Unable to create fee."
            );

        } finally {

            setSaving(false);

        }

    };


    // ==========================================
    // STATUS UPDATE
    // ==========================================

    const updateStatus = async (
        feeId,
        status
    ) => {

        try {

            await api.put(
                `/fees/${feeId}`,
                { status }
            );

            await loadFees();

        } catch (error) {

            console.error(
                "Update Fee Error:",
                error
            );

            alert(
                error.response?.data?.message ||
                "Unable to update fee."
            );

        }

    };


    // ==========================================
    // HELPERS
    // ==========================================

    const getFeeTypeLabel = (type) => {

        switch (type) {

            case "MONTHLY":
                return "Monthly Fee";

            case "COSTUME":
                return "Costume Fee";

            case "COMPETITION":
                return "Competition Fee";

            default:
                return type;

        }

    };


    const formatAmount = (amount) => {

        return `₹${Number(amount || 0).toLocaleString(
            "en-IN"
        )}`;

    };


    const formatDate = (date) => {

        if (!date) return "-";

        return new Date(date).toLocaleDateString(
            "en-IN"
        );

    };


    // ==========================================
    // SUMMARY
    // ==========================================

    const pendingFees =
        fees.filter(
            fee => fee.status === "PENDING"
        );

    const completedFees =
        fees.filter(
            fee => fee.status === "COMPLETED"
        );

    const pendingAmount =
        pendingFees.reduce(
            (total, fee) =>
                total + Number(fee.amount || 0),
            0
        );

    const completedAmount =
        completedFees.reduce(
            (total, fee) =>
                total + Number(fee.amount || 0),
            0
        );


    // ==========================================
    // UI
    // ==========================================

    return (

        <div className="module-page fees-page">

	    {/* HEADER */}

<div className="fees-header">

    <div className="fees-header-content">

        <div className="fees-header-icon">
            💰
        </div>

        <div>

            <h1>
                Fees Management
            </h1>

            <p>
                Manage monthly, costume and competition fees.
            </p>

        </div>

    </div>


    <button
        className="fees-add-button"
        onClick={() => setShowForm(!showForm)}
    >
        {showForm ? "Close" : "+ Add Fee"}
    </button>

</div>



{/* SUMMARY */}

<div className="fees-summary">

    <div className="fees-summary-card">

        <div className="fees-summary-label">
            Total Fees
        </div>

        <div className="fees-summary-value">
            {fees.length}
        </div>

        <div className="fees-summary-subtitle">
            All fee records
        </div>

    </div>


    <div className="fees-summary-card pending">

        <div className="fees-summary-label">
            Pending
        </div>

        <div className="fees-summary-value">
            {formatAmount(pendingAmount)}
        </div>

        <div className="fees-summary-subtitle">
            {pendingFees.length} pending fee record
            {pendingFees.length !== 1 ? "s" : ""}
        </div>

    </div>


    <div className="fees-summary-card completed">

        <div className="fees-summary-label">
            Completed
        </div>

        <div className="fees-summary-value">
            {formatAmount(completedAmount)}
        </div>

        <div className="fees-summary-subtitle">
            {completedFees.length} completed fee record
            {completedFees.length !== 1 ? "s" : ""}
        </div>

    </div>

</div>

            {/* ADD FEE FORM */}

            {showForm && (

                <div className="fees-form-card">

                    <h2 className="fees-form-title">
                        Add Fee
                    </h2>

                    <form
                        onSubmit={handleSubmit}
                        className="fees-form"
                    >

                        {/* STUDENT */}

                        <div className="fees-field">

                            <label>
                                Student
                            </label>

                            <select
                                name="student_id"
                                value={form.student_id}
                                onChange={handleChange}
                                required
                            >

                                <option value="">
                                    Select Student
                                </option>

                                {students.map(student => (

                                    <option
                                        key={student.id}
                                        value={student.id}
                                    >
                                        {student.name}
                                    </option>

                                ))}

                            </select>

                        </div>


                        {/* FEE TYPE */}

                        <div className="fees-field">

                            <label>
                                Fee Type
                            </label>

                            <select
                                name="fee_type"
                                value={form.fee_type}
                                onChange={
                                    handleFeeTypeChange
                                }
                                required
                            >

                                <option value="MONTHLY">
                                    Monthly Fee
                                </option>

                                <option value="COSTUME">
                                    Costume Fee
                                </option>

                                <option value="COMPETITION">
                                    Competition Fee
                                </option>

                            </select>

                        </div>


                        {/* AMOUNT */}

                        <div className="fees-field">

                            <label>
                                Amount
                            </label>

                            <input
                                type="number"
                                name="amount"
                                value={form.amount}
                                onChange={handleChange}
                                min="0"
                                step="0.01"
                                placeholder="Enter amount"
                                required
                            />

                        </div>


                        {/* DUE DATE */}

                        <div className="fees-field">

                            <label>
                                Due Date
                            </label>

                            <input
                                type="date"
                                name="due_date"
                                value={form.due_date}
                                onChange={handleChange}
                            />

                        </div>


                        {/* MONTH */}

                        {form.fee_type === "MONTHLY" && (

                            <div className="fees-field">

                                <label>
                                    Month
                                </label>

                                <select
                                    name="month"
                                    value={form.month}
                                    onChange={handleChange}
                                >

                                    {[
                                        "January",
                                        "February",
                                        "March",
                                        "April",
                                        "May",
                                        "June",
                                        "July",
                                        "August",
                                        "September",
                                        "October",
                                        "November",
                                        "December"
                                    ].map(
                                        (monthName, index) => (

                                            <option
                                                key={index + 1}
                                                value={index + 1}
                                            >
                                                {monthName}
                                            </option>

                                        )
                                    )}

                                </select>

                            </div>

                        )}


                        {/* YEAR */}

                        {form.fee_type === "MONTHLY" && (

                            <div className="fees-field">

                                <label>
                                    Year
                                </label>

                                <input
                                    type="number"
                                    name="year"
                                    value={form.year}
                                    onChange={handleChange}
                                />

                            </div>

                        )}


                        {/* DESCRIPTION */}

                        <div className="fees-field full-width">
                        

                            <label>
                                Description
                            </label>

                            <input
                                type="text"
                                name="description"
                                value={form.description}
                                onChange={handleChange}
                                placeholder="Optional description"
                            />

                        </div>


                        {/* STATUS */}

                        <div className="fees-field">

                            <label>
                                Status
                            </label>

                            <select
                                name="status"
                                value={form.status}
                                onChange={handleChange}
                            >

                                <option value="PENDING">
                                    PENDING
                                </option>

                                <option value="COMPLETED">
                                    COMPLETED
                                </option>

                            </select>

                        </div>


                        {/* PAYMENT REFERENCE */}

                        <div className="fees-field">

                            <label>
                                Payment Reference
                            </label>

                            <input
                                type="text"
                                name="payment_reference"
                                value={
                                    form.payment_reference
                                }
                                onChange={handleChange}
                                placeholder="Optional"
                            />

                        </div>


                        {/* BUTTON */}

                        <div className="fees-form-actions" >

                            <button
                                type="submit"
                                disabled={saving}
		    		className="fees-save-button"
                            >
                                {saving
                                    ? "Saving..."
                                    : "Save Fee"}
                            </button>

                        </div>

                    </form>

                </div>

            )}

{/* FEES TABLE */}

<div className="fees-records-card">

    <div className="fees-records-header">

        <div>

            <h2>
                Fee Records
            </h2>

            <span>
                Manage all student fee records
            </span>

        </div>

    </div>


    {loading && (

        <div className="fees-empty">

            <div className="fees-empty-icon">
                ⏳
            </div>

            <strong>
                Loading fees...
            </strong>

        </div>

    )}


    {!loading && fees.length === 0 && (

        <div className="fees-empty">

            <div className="fees-empty-icon">
                💰
            </div>

            <strong>
                No fee records found
            </strong>

            <span>
                Add a fee to see it here.
            </span>

        </div>

    )}


    {!loading && fees.length > 0 && (

        <div className="fees-table-wrapper">

            <table className="fees-table">

                <thead>

                    <tr>

                        <th>
                            Student
                        </th>

                        <th>
                            Fee Type
                        </th>

                        <th>
                            Description
                        </th>

                        <th>
                            Amount
                        </th>

                        <th>
                            Due Date
                        </th>

                        <th>
                            Status
                        </th>
                        <th>
                            BRANCH
                        </th>

                    </tr>

                </thead>


                <tbody>

                    {fees.map((fee) => (

                        <tr key={fee.id}>

                            <td>

                                <div className="fee-student-name">
                                    {fee.student_name}
                                </div>

                                <span className="fee-student-code">
                                    {fee.student_code}
                                </span>

                            </td>


                            <td className="fee-type">

                                {getFeeTypeLabel(
                                    fee.fee_type
                                )}

                            </td>


                            <td className="fee-description">

                                {fee.description || "-"}

                            </td>


                            <td className="fee-amount">

                                {formatAmount(
                                    fee.amount
                                )}

                            </td>


                            <td className="fee-date">

                                {formatDate(
                                    fee.due_date
                                )}

                            </td>


                            <td>

                                <select
                                    value={fee.status}
                                    onChange={(event) =>
                                        updateStatus(
                                            fee.id,
                                            event.target.value
                                        )
                                    }
                                    className={`fee-status-select ${
                                        fee.status === "PENDING"
                                            ? "pending"
                                            : "completed"
                                    }`}
                                >

                                    <option value="PENDING">
                                        PENDING
                                    </option>

                                    <option value="COMPLETED">
                                        COMPLETED
                                    </option>

                                </select>

                            </td>

                        
                        <td className="fee-branch">
                            <span className="fee-branch-name">
                                {fee.branch_name || "—"}
                            </span>
                        </td>
</tr>

		    ))}

                </tbody>

            </table>

        </div>

    )}

	</div>
  </div>	
	

);

}
export default Fees;

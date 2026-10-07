import { useMemo } from "react";

function BranchAttendanceSummary({
    students = [],
    attendance = []
}) {

    const branchRows = useMemo(() => {

        const studentsById = new Map();

        students.forEach((student) => {

            studentsById.set(
                Number(student.id),
                student
            );

        });

        const branches = new Map();

        /*
         * Every student contributes to the branch total.
         *
         * No branch names are hard-coded.
         * New branches automatically appear when their
         * students are returned by the Students API.
         */

        students.forEach((student) => {

            const branchId =
                student.branch_id !== null &&
                student.branch_id !== undefined
                    ? String(student.branch_id)
                    : "unassigned";

            if (!branches.has(branchId)) {

                branches.set(
                    branchId,
                    {
                        branch_id:
                            student.branch_id,

                        branch_name:
                            student.branch_name ||
                            "Unassigned",

                        branch_code:
                            student.branch_code ||
                            "—",

                        total_students: 0,

                        present: 0,

                        absent: 0,

                        late: 0,

                        marked: 0
                    }
                );

            }

            branches.get(
                branchId
            ).total_students += 1;

        });

        /*
         * Apply today's/selected-date attendance.
         */

        attendance.forEach((record) => {

            const student =
                studentsById.get(
                    Number(record.student_id)
                );

            if (!student) {
                return;
            }

            const branchId =
                student.branch_id !== null &&
                student.branch_id !== undefined
                    ? String(student.branch_id)
                    : "unassigned";

            if (!branches.has(branchId)) {

                branches.set(
                    branchId,
                    {
                        branch_id:
                            student.branch_id,

                        branch_name:
                            student.branch_name ||
                            "Unassigned",

                        branch_code:
                            student.branch_code ||
                            "—",

                        total_students: 0,

                        present: 0,

                        absent: 0,

                        late: 0,

                        marked: 0
                    }
                );

            }

            const branch =
                branches.get(branchId);

            branch.marked += 1;

            if (record.status === "PRESENT") {
                branch.present += 1;
            }

            if (record.status === "ABSENT") {
                branch.absent += 1;
            }

            if (record.status === "LATE") {
                branch.late += 1;
            }

        });

        return Array.from(
            branches.values()
        ).sort(
            (a, b) =>
                a.branch_name.localeCompare(
                    b.branch_name
                )
        );

    }, [students, attendance]);


    if (branchRows.length === 0) {

        return null;

    }


    return (
        <div className="branch-attendance-summary">

            <div className="branch-attendance-header">

                <div>

                    <h3>
                        Branch-wise Attendance
                    </h3>

                    <p>
                        Attendance and student totals by branch
                    </p>

                </div>

            </div>


            <div className="branch-attendance-table-wrap">

                <table className="branch-attendance-table">

                    <thead>

                        <tr>

                            <th>
                                BRANCH
                            </th>

                            <th>
                                STUDENTS
                            </th>

                            <th>
                                PRESENT
                            </th>

                            <th>
                                ABSENT
                            </th>

                            <th>
                                LATE
                            </th>

                            <th>
                                RATE
                            </th>

                        </tr>

                    </thead>


                    <tbody>

                        {branchRows.map(
                            (branch) => {

                                const rate =
                                    branch.total_students > 0
                                        ? (
                                            branch.present /
                                            branch.total_students *
                                            100
                                        ).toFixed(1)
                                        : "0.0";


                                return (

                                    <tr
                                        key={
                                            branch.branch_id ??
                                            branch.branch_name
                                        }
                                    >

                                        <td>

                                            <div className="branch-attendance-name">

                                                <strong>
                                                    {branch.branch_name}
                                                </strong>

                                                <span>
                                                    {branch.branch_code}
                                                </span>

                                            </div>

                                        </td>


                                        <td>

                                            <strong>
                                                {branch.total_students}
                                            </strong>

                                        </td>


                                        <td>

                                            <span className="branch-attendance-number present">
                                                {branch.present}
                                            </span>

                                        </td>


                                        <td>

                                            <span className="branch-attendance-number absent">
                                                {branch.absent}
                                            </span>

                                        </td>


                                        <td>

                                            <span className="branch-attendance-number late">
                                                {branch.late}
                                            </span>

                                        </td>


                                        <td>

                                            <span className="branch-attendance-rate">
                                                {rate}%
                                            </span>

                                        </td>

                                    </tr>

                                );

                            }
                        )}

                    </tbody>

                </table>

            </div>

        </div>
    );
}

export default BranchAttendanceSummary;

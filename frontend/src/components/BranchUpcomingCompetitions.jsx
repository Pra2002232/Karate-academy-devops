import { useEffect, useState } from "react";
import api from "../services/api";
import "./UpcomingCompetitions.css";

function formatDate(value) {

    if (!value) return "-";

    return new Date(value).toLocaleDateString(
        "en-IN",
        {
            day: "2-digit",
            month: "short",
            year: "numeric"
        }
    );
}

export default function BranchUpcomingCompetitions() {

    const [
        competitions,
        setCompetitions
    ] = useState([]);

    const [
        selected,
        setSelected
    ] = useState(null);

    const [
        loading,
        setLoading
    ] = useState(true);

    const [
        error,
        setError
    ] = useState("");

    useEffect(() => {

        const load = async () => {

            try {

                const response =
                    await api.get(
                        "/competitions"
                    );

                const today =
                    new Date()
                        .toISOString()
                        .slice(0, 10);

                const upcoming =
                    (
                        response.data.competitions ||
                        []
                    )
                        .filter(
                            competition =>
                                String(
                                    competition.competition_date
                                ).slice(0, 10) >= today
                        )
                        .sort(
                            (a, b) =>
                                String(
                                    a.competition_date
                                ).localeCompare(
                                    String(
                                        b.competition_date
                                    )
                                )
                        );

                setCompetitions(
                    upcoming
                );

            } catch (err) {

                console.error(err);

                setError(
                    err.response?.data?.message ||
                    "Unable to load upcoming competitions."
                );

            } finally {

                setLoading(false);

            }

        };

        load();

    }, []);

    const openDetails =
        async competition => {

            try {

                const response =
                    await api.get(
                        `/competitions/${competition.id}`
                    );

                setSelected(
                    response.data
                );

            } catch (err) {

                console.error(err);

                setError(
                    err.response?.data?.message ||
                    "Unable to load competition details."
                );

            }

        };

    return (
        <section className="branch-upcoming-competitions">

            <div className="branch-upcoming-heading">

                <div>

                    <span>
                        ACADEMY SCHEDULE
                    </span>

                    <h2>
                        Upcoming Competitions
                    </h2>

                    <p>
                        Super Admin and your branch competitions
                    </p>

                </div>

            </div>

            {error && (
                <div className="branch-competition-error">
                    {error}
                </div>
            )}

            {loading ? (

                <div className="branch-competition-empty">
                    Loading competitions...
                </div>

            ) : competitions.length === 0 ? (

                <div className="branch-competition-empty">
                    No upcoming competitions.
                </div>

            ) : (

                <div className="branch-competition-list">

                    {competitions.map(
                        competition => (

                            <button
                                type="button"
                                key={competition.id}
                                className="branch-competition-card"
                                onClick={() =>
                                    openDetails(
                                        competition
                                    )
                                }
                            >

                                <div className="branch-competition-date">

                                    <strong>
                                        {
                                            new Date(
                                                competition.competition_date
                                            ).getDate()
                                        }
                                    </strong>

                                    <span>
                                        {
                                            new Date(
                                                competition.competition_date
                                            )
                                                .toLocaleString(
                                                    "en-IN",
                                                    {
                                                        month: "short"
                                                    }
                                                )
                                                .toUpperCase()
                                        }
                                    </span>

                                </div>

                                <div className="branch-competition-info">

                                    <strong>
                                        {
                                            competition.competition_name
                                        }
                                    </strong>

                                    <span>
                                        {
                                            competition.branch_name
                                                ? `Organized by: ${competition.branch_name}`
                                                : "Organized by: Academy"
                                        }
                                    </span>

                                    <small>
                                        {
                                            competition.location ||
                                            "Location not specified"
                                        }
                                    </small>

                                </div>

                                <div className="branch-competition-status">
                                    {
                                        competition.registered_students ||
                                        0
                                    }
                                    {" "}
                                    registered
                                </div>

                                <span>
                                    →
                                </span>

                            </button>

                        )
                    )}

                </div>

            )}

            {selected && (

                <div
                    className="competition-readonly-overlay"
                    onClick={() => setSelected(null)}
                >

                    <div
                        className="competition-readonly-modal"
                        onClick={event =>
                            event.stopPropagation()
                        }
                    >

                        <div className="competition-detail-header">

                            <div>

                                <span>
                                    COMPETITION DETAILS
                                </span>

                                <h2>
                                    {
                                        selected
                                            .competition
                                            .competition_name
                                    }
                                </h2>

                            </div>

                            <button
                                type="button"
                                onClick={() =>
                                    setSelected(null)
                                }
                            >
                                ×
                            </button>

                        </div>

                        <div className="competition-detail-grid">

                            <div>
                                <label>Date</label>
                                <strong>
                                    {
                                        formatDate(
                                            selected
                                                .competition
                                                .competition_date
                                        )
                                    }
                                </strong>
                            </div>

                            <div>
                                <label>Organizing Branch</label>
                                <strong>
                                    {
                                        selected
                                            .competition
                                            .branch_name ||
                                        "Academy"
                                    }
                                </strong>
                            </div>

                            <div>
                                <label>Location</label>
                                <strong>
                                    {
                                        selected
                                            .competition
                                            .location ||
                                        "Not specified"
                                    }
                                </strong>
                            </div>

                            <div>
                                <label>Organizer</label>
                                <strong>
                                    {
                                        selected
                                            .competition
                                            .organizer ||
                                        "Not specified"
                                    }
                                </strong>
                            </div>

                        </div>

                        {selected.competition.description && (

                            <div className="competition-detail-description">

                                <label>
                                    Competition Details
                                </label>

                                <p>
                                    {
                                        selected
                                            .competition
                                            .description
                                    }
                                </p>

                            </div>

                        )}

                        <div className="branch-competition-readonly-note">

                            Branch Admin can manage this competition
                            from the Competitions module according
                            to branch permissions.

                        </div>

                    </div>

                </div>

            )}

        </section>
    );
}

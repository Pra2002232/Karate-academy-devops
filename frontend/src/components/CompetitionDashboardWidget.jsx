import { useEffect, useState } from "react";
import api from "../services/api";
import "./CompetitionDashboardWidget.css";

export default function CompetitionDashboardWidget() {

    const [competitions, setCompetitions] =
        useState([]);

    const [loading, setLoading] =
        useState(true);

    useEffect(() => {

        let mounted = true;

        api.get("/competitions")
            .then(response => {

                if (!mounted) return;

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
                            item =>
                                item.competition_date >=
                                today
                        )
                        .slice(0, 4);

                setCompetitions(upcoming);

            })
            .catch(error => {

                console.error(
                    "Competition dashboard error:",
                    error
                );

            })
            .finally(() => {

                if (mounted) {
                    setLoading(false);
                }

            });

        return () => {
            mounted = false;
        };

    }, []);

    return (
        <section className="competition-dashboard-panel">

            <div className="competition-dashboard-header">

                <div>
                    <h2>
                        Upcoming Competitions
                    </h2>

                    <p>
                        Academy competition schedule
                    </p>
                </div>

                <a
                    href="/competitions"
                    className="competition-dashboard-manage"
                >
                    Manage →
                </a>

            </div>

            {loading ? (

                <div className="competition-dashboard-empty">
                    Loading competitions...
                </div>

            ) : competitions.length === 0 ? (

                <div className="competition-dashboard-empty">
                    No upcoming competitions.
                </div>

            ) : (

                <div className="competition-dashboard-grid">

                    {competitions.map(
                        competition => {

                            const date =
                                new Date(
                                    competition.competition_date
                                );

                            return (
                                <a
                                    key={
                                        competition.id
                                    }
                                    href={
                                        `/competitions?id=${competition.id}`
                                    }
                                    className="competition-dashboard-card"
                                >

                                    <div className="competition-dashboard-date">

                                        <strong>
                                            {date.getDate()}
                                        </strong>

                                        <span>
                                            {
                                                date
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

                                    <div className="competition-dashboard-info">

                                        <strong>
                                            {
                                                competition
                                                    .competition_name
                                            }
                                        </strong>

                                        <span>
                                            📍{" "}
                                            {
                                                competition
                                                    .branch_name ||
                                                "Academy"
                                            }
                                        </span>

                                        <span>
                                            {
                                                competition
                                                    .location ||
                                                "Location not specified"
                                            }
                                        </span>

                                    </div>

                                    <span className="competition-dashboard-arrow">
                                        →
                                    </span>

                                </a>
                            );
                        }
                    )}

                </div>

            )}

        </section>
    );
}

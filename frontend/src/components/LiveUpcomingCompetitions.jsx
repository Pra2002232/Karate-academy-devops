import { useEffect, useState } from "react";
import api from "../services/api";

function formatCompetitionDate(value) {
    if (!value) return null;

    const date = new Date(value);

    return {
        day: String(
            date.getDate()
        ).padStart(2, "0"),

        month:
            date
                .toLocaleString(
                    "en-IN",
                    {
                        month: "short"
                    }
                )
                .toUpperCase()
    };
}

export default function LiveUpcomingCompetitions({
    compact = false
}) {

    const [
        competitions,
        setCompetitions
    ] = useState([]);

    useEffect(() => {

        let mounted = true;

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
                        response
                            .data
                            .competitions || []
                    )
                        .filter(
                            competition =>
                                String(
                                    competition
                                        .competition_date
                                ).slice(0, 10) >=
                                today
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

                if (mounted) {
                    setCompetitions(
                        upcoming
                    );
                }

            } catch (error) {

                console.error(
                    "Upcoming competitions error:",
                    error
                );

                if (mounted) {
                    setCompetitions([]);
                }

            }

        };

        load();

        return () => {
            mounted = false;
        };

    }, []);

    if (!competitions.length) {
        return null;
    }

    return (
        <>
            {competitions.map(
                (
                    competition,
                    index
                ) => {

                    const date =
                        formatCompetitionDate(
                            competition
                                .competition_date
                        );

                    return (
                        <a
                            key={
                                competition.id
                            }
                            href={
                                `/competitions?id=${competition.id}`
                            }
                            className={
                                compact
                                    ? "event-item live-competition-item"
                                    : "event-item live-competition-item"
                            }
                            style={{
                                textDecoration:
                                    "none",
                                color:
                                    "inherit"
                            }}
                        >

                            <div
                                className={
                                    index % 3 === 0
                                        ? "event-date red-date"
                                        : index % 3 === 1
                                            ? "event-date blue-date"
                                            : "event-date yellow-date"
                                }
                            >

                                <strong>
                                    {date?.day || "--"}
                                </strong>

                                <span>
                                    {date?.month || "---"}
                                </span>

                            </div>

                            <div className="event-details">

                                <strong>
                                    {
                                        competition
                                            .competition_name
                                    }
                                </strong>

                                <span>
                                    {
                                        competition
                                            .branch_name
                                            ? `📍 ${competition.branch_name}`
                                            : "📍 Academy-wide"
                                    }
                                </span>

                                <span>
                                    {
                                        competition.location ||
                                        "Location not specified"
                                    }
                                </span>

                            </div>

                            <span className="live-competition-arrow">
                                →
                            </span>

                        </a>
                    );

                }
            )}
        </>
    );
}

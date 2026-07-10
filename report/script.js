const tbody = document.getElementById("reportBody");
const empty = document.getElementById("emptyMessage");

async function loadReports() {
    try {

        const response = await fetch("http://localhost:3000/students");

        if (!response.ok) {
            throw new Error("Erro ao carregar relatórios.");
        }

        const reports = await response.json();

        console.log("Relatórios:", reports);

        renderReports(reports);

    } catch (error) {

        console.error(error);

        tbody.innerHTML = "";

        empty.style.display = "block";
    }
}

function renderReports(reports) {

    tbody.innerHTML = "";

    if (!reports || reports.length === 0) {

        empty.style.display = "block";
        return;

    }

    empty.style.display = "none";

    reports.forEach(report => {

        tbody.innerHTML += `
            <tr>

                <td>
                    <div class="report-title">
                        <strong>${report.title || "Sem título"}</strong>
                        <span>${report.description || ""}</span>
                    </div>
                </td>

                <td>${report.student || "-"}</td>

                <td>${report.teacher || "-"}</td>

                <td>${formatDate(report.createdAt)}</td>

                <td>

                    <div class="report-buttons">

                        <button
                            class="btn-report btn-view"
                            onclick="viewReport(${report.id})">

                            <i class="fa-regular fa-eye"></i>

                        </button>

                        <button
                            class="btn-report btn-download"
                            onclick="downloadReport(${report.id})">

                            <i class="fa-solid fa-download"></i>

                        </button>

                    </div>

                </td>

            </tr>
        `;
    });
}

function formatDate(date) {

    if (!date) return "-";

    return new Date(date).toLocaleDateString("pt-BR");
}

function viewReport(id) {

    window.open(`http://localhost:3000/api/reports/${id}`, "_blank");

}

function downloadReport(id) {

    window.open(`http://localhost:3000/api/reports/${id}/download`, "_blank");

}

loadReports();
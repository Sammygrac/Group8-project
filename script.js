(() => {
    "use strict";

    const KEYS = {
        equipment: "muniEquipment",
        records: "muniBorrowRecords"
    };

    const starterEquipment = [
        { id: "dell-laptop", name: "Dell Laptop", category: "Laptop", status: "Available" },
        { id: "projector", name: "Projector", category: "Projector", status: "Available" },
        { id: "microphone", name: "Microphone", category: "Audio equipment", status: "Available" },
        { id: "printer", name: "Printer", category: "Other", status: "Available" },
        { id: "camera", name: "Camera", category: "Camera", status: "In repair" }
    ];

    function read(key, fallback) {
        try {
            const saved = localStorage.getItem(key);
            return saved ? JSON.parse(saved) : fallback;
        } catch {
            return fallback;
        }
    }

    function save(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch {
            notify("Could not save your changes in this browser.", "error");
            return false;
        }
    }

    const getEquipment = () => read(KEYS.equipment, starterEquipment);
    const getRecords = () => read(KEYS.records, []);

    function notify(message, type = "success") {
        let notice = document.querySelector("[data-app-notice]");

        if (!notice) {
            notice = document.createElement("p");
            notice.dataset.appNotice = "";
            notice.setAttribute("role", "status");
            notice.setAttribute("aria-live", "polite");
            document.querySelector("main")?.prepend(notice);
        }

        if (!notice) return;

        notice.className = `app-notice app-notice--${type}`;
        notice.textContent = message;
        notice.hidden = false;

        clearTimeout(notify.timeout);
        notify.timeout = setTimeout(() => {
            notice.hidden = true;
        }, 6000);
    }

    function slugify(value) {
        return String(value)
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, "");
    }

    function localDateString(date = new Date()) {
        const adjusted = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
        return adjusted.toISOString().slice(0, 10);
    }

    function addDays(dateString, days) {
        const date = new Date(`${dateString}T12:00:00`);
        date.setDate(date.getDate() + days);
        return localDateString(date);
    }

    function newReference() {
        const year = new Date().getFullYear();
        const number = getRecords().length + 1;
        return `MUNI-${year}-${String(number).padStart(4, "0")}`;
    }

    function equipmentNameFor(record) {
        return record.name || record.equipment || "";
    }

    function renderEquipmentTables() {
        const equipment = getEquipment();

        const availableBody = document.querySelector("#available-equipment-table tbody");
        if (availableBody) {
            availableBody.replaceChildren();

            equipment.forEach((item, index) => {
                const row = document.createElement("tr");
                [String(index + 1), item.name, item.category, item.status].forEach((value) => {
                    const cell = document.createElement("td");
                    cell.textContent = value;
                    row.append(cell);
                });

                const action = document.createElement("td");
                if (item.status === "Available") {
                    const button = document.createElement("button");
                    button.type = "button";
                    button.dataset.equipment = item.id;
                    button.textContent = "Select";
                    action.append(button);
                } else {
                    action.textContent = "Unavailable";
                }

                row.append(action);
                availableBody.append(row);
            });
        }

        const manageBody = document.querySelector(".page-manage-equipment .panel-list .records-table tbody");
        if (manageBody) {
            manageBody.replaceChildren();

            equipment.forEach((item, index) => {
                const row = document.createElement("tr");
                [String(index + 1), item.name, item.category].forEach((value) => {
                    const cell = document.createElement("td");
                    cell.textContent = value;
                    row.append(cell);
                });

                const statusCell = document.createElement("td");
                const badge = document.createElement("span");
                badge.className = item.status === "Available" ? "status-available" : "status-warning";
                badge.textContent = item.status;
                statusCell.append(badge);
                row.append(statusCell);

                const actionCell = document.createElement("td");

                if (item.status === "Available") {
                    const borrowLink = document.createElement("a");
                    borrowLink.className = "button records-table__action";
                    borrowLink.href = `borrow.html?equipment=${encodeURIComponent(item.id)}`;
                    borrowLink.textContent = "Borrow";
                    actionCell.append(borrowLink, document.createTextNode(" "));
                }

                const editButton = document.createElement("button");
                editButton.type = "button";
                editButton.dataset.action = "edit";
                editButton.dataset.id = item.id;
                editButton.textContent = "Edit";

                const deleteButton = document.createElement("button");
                deleteButton.type = "button";
                deleteButton.dataset.action = "delete";
                deleteButton.dataset.id = item.id;
                deleteButton.textContent = "Delete";

                actionCell.append(editButton, document.createTextNode(" "), deleteButton);
                row.append(actionCell);
                manageBody.append(row);
            });
        }

        const homeBody = document.querySelector(".home-equipment tbody");
        if (homeBody) {
            homeBody.replaceChildren();

            equipment.forEach((item) => {
                const row = document.createElement("tr");
                [item.name, item.category, item.status].forEach((value) => {
                    const cell = document.createElement("td");
                    cell.textContent = value;
                    row.append(cell);
                });

                const action = document.createElement("td");
                if (item.status === "Available") {
                    const link = document.createElement("a");
                    link.href = `borrow.html?equipment=${encodeURIComponent(item.id)}`;
                    link.textContent = "Borrow";
                    action.append(link);
                } else {
                    action.textContent = "Unavailable";
                }

                row.append(action);
                homeBody.append(row);
            });
        }
    }

    function bindBorrowPage() {
        const form = document.querySelector(".form-borrow");
        if (!form) return;

        const equipmentSelect = form.querySelector("#equipment");
        const borrowDate = form.querySelector("#borrow-date");
        const returnDate = form.querySelector("#expected-return");

        if (borrowDate) {
            borrowDate.min = localDateString();
            borrowDate.addEventListener("change", () => {
                if (!borrowDate.value || !returnDate) return;
                returnDate.min = borrowDate.value;
                if (!returnDate.value || returnDate.value < borrowDate.value) {
                    returnDate.value = addDays(borrowDate.value, 7);
                }
            });
        }

        const fromUrl = new URLSearchParams(location.search).get("equipment");
        if (equipmentSelect && fromUrl) {
            const match = Array.from(equipmentSelect.options).find((option) =>
                option.value === fromUrl || slugify(option.textContent) === fromUrl
            );
            if (match) equipmentSelect.value = match.value;
        }

        document.addEventListener("click", (event) => {
            const button = event.target.closest("[data-equipment]");
            if (!button || !equipmentSelect) return;

            const value = button.dataset.equipment;
            const match = Array.from(equipmentSelect.options).find((option) =>
                option.value === value || slugify(option.textContent) === value
            );

            if (match) {
                equipmentSelect.value = match.value;
                equipmentSelect.focus();
                equipmentSelect.scrollIntoView({ behavior: "smooth", block: "center" });
            }
        });

        form.addEventListener("submit", (event) => {
            event.preventDefault();
            if (!form.reportValidity()) return;

            const studentName = form.querySelector("#student-name")?.value.trim();
            const selectedOption = equipmentSelect?.selectedOptions[0];
            const selectedValue = equipmentSelect?.value;
            const start = borrowDate?.value;
            let end = returnDate?.value;

            if (!studentName || !selectedValue || !start) {
                notify("Complete the required fields before submitting.", "error");
                return;
            }

            if (!end) {
                end = addDays(start, 7);
                if (returnDate) returnDate.value = end;
            }

            if (end < start) {
                notify("Expected return date must be on or after the borrow date.", "error");
                return;
            }

            const equipment = getEquipment();
            const item = equipment.find((entry) =>
                entry.id === selectedValue || slugify(entry.name) === selectedValue
            );

            if (item && item.status !== "Available") {
                notify(`${item.name} is not currently available.`, "error");
                return;
            }

            const records = getRecords();
            const record = {
                reference: newReference(),
                studentName,
                equipmentId: item?.id || selectedValue,
                equipment: item?.name || selectedOption?.textContent.trim() || selectedValue,
                borrowDate: start,
                expectedReturn: end,
                notes: form.querySelector("#borrow-notes")?.value.trim() || "",
                status: "On loan",
                createdAt: new Date().toISOString()
            };

            records.unshift(record);
            if (!save(KEYS.records, records)) return;

            if (item) {
                item.status = "Borrowed";
                save(KEYS.equipment, equipment);
            }

            form.reset();
            notify(`Borrow request submitted. Reference: ${record.reference}`);
            renderEquipmentTables();
        });
    }

    function bindManagePage() {
        const form = document.querySelector(".form-equipment");
        if (!form) return;

        form.addEventListener("submit", (event) => {
            event.preventDefault();
            if (!form.reportValidity()) return;

            const name = form.querySelector("#equipment-name")?.value.trim();
            const categorySelect = form.querySelector("#category");
            const statusSelect = form.querySelector("#status");
            const category = categorySelect?.selectedOptions[0]?.textContent.trim();
            const status = statusSelect?.value;

            if (!name || !category || !status) {
                notify("Enter the equipment name, category, and status.", "error");
                return;
            }

            const equipment = getEquipment();
            const id = slugify(name);
            const existing = equipment.find((item) =>
                item.id === id || item.name.toLowerCase() === name.toLowerCase()
            );

            if (existing) {
                existing.name = name;
                existing.category = category;
                existing.status = status;
            } else {
                equipment.push({ id: id || `item-${Date.now()}`, name, category, status });
            }

            if (save(KEYS.equipment, equipment)) {
                form.reset();
                renderEquipmentTables();
                notify(`${name} saved.`);
            }
        });

        document.addEventListener("click", (event) => {
            const button = event.target.closest("[data-action]");
            if (!button) return;

            const equipment = getEquipment();
            const item = equipment.find((entry) => entry.id === button.dataset.id);
            if (!item) return;

            if (button.dataset.action === "delete") {
                if (!confirm(`Delete ${item.name} from the equipment list?`)) return;
                save(KEYS.equipment, equipment.filter((entry) => entry.id !== item.id));
                renderEquipmentTables();
                notify(`${item.name} deleted.`);
            }

            if (button.dataset.action === "edit") {
                form.querySelector("#equipment-name").value = item.name;

                const category = form.querySelector("#category");
                const categoryOption = Array.from(category.options).find((option) =>
                    option.textContent.trim() === item.category || option.value === item.category
                );
                if (categoryOption) category.value = categoryOption.value;

                form.querySelector("#status").value = item.status;
                form.scrollIntoView({ behavior: "smooth", block: "start" });
                form.querySelector("#equipment-name").focus();
            }
        });
    }

    function bindSearch() {
        document.querySelectorAll('input[type="search"]').forEach((input) => {
            input.addEventListener("input", () => {
                const table = input.closest(".panel, section")?.querySelector(".records-table")
                    || document.querySelector(".records-table");
                if (!table) return;

                const query = input.value.trim().toLowerCase();
                table.querySelectorAll("tbody tr").forEach((row) => {
                    row.hidden = !row.textContent.toLowerCase().includes(query);
                });
            });
        });
    }

    function bindRecordsPage() {
        const table = document.querySelector("#borrow-records table, #borrow-records-table, .page-records .records-table");
        const search = document.querySelector(".records__search, [data-records-search]");
        const period = document.querySelector(".records__period, [data-records-period]");

        if (!table) return;

        const applyFilters = () => {
            const query = search?.value.trim().toLowerCase() || "";
            const allTime = period?.selectedOptions[0]?.textContent.toLowerCase().includes("all time");
            const cutoff = allTime ? null : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

            table.querySelectorAll("tbody tr").forEach((row) => {
                const textMatches = row.textContent.toLowerCase().includes(query);
                const dateCell = row.cells[3];
                const parsedDate = dateCell ? new Date(dateCell.textContent.trim()) : null;
                const dateMatches = !cutoff || !parsedDate || Number.isNaN(parsedDate.getTime()) || parsedDate >= cutoff;
                row.hidden = !(textMatches && dateMatches);
            });
        };

        search?.addEventListener("input", applyFilters);
        period?.addEventListener("change", applyFilters);
    }

    function bindReturnPage() {
        const form = document.querySelector(".form-return");
        if (!form) return;

        const select = form.querySelector("#borrow-record");
        const dateInput = form.querySelector("#return-date");
        const records = getRecords().filter((record) => record.status !== "Returned");

        if (dateInput && !dateInput.value) dateInput.value = localDateString();

        if (select && records.length) {
            select.replaceChildren(new Option("Select Borrow Record", "", true, true));
            records.forEach((record) => {
                select.add(new Option(
                    `${record.reference} — ${record.studentName} — ${record.equipment}`,
                    record.reference
                ));
            });
        }

        form.addEventListener("submit", (event) => {
            event.preventDefault();
            if (!form.reportValidity()) return;

            const reference = select?.value;
            const condition = form.querySelector("#condition")?.value;
            if (!reference || !condition || condition.toLowerCase().includes("select")) {
                notify("Choose a borrow record and condition.", "error");
                return;
            }

            const allRecords = getRecords();
            const record = allRecords.find((entry) => entry.reference === reference);
            if (!record) {
                notify("Borrow record was not found in this browser.", "error");
                return;
            }

            record.status = "Returned";
            record.returnedDate = dateInput?.value || localDateString();
            record.returnCondition = condition;
            record.returnNotes = form.querySelector("#notes")?.value.trim() || "";
            save(KEYS.records, allRecords);

            const equipment = getEquipment();
            const item = equipment.find((entry) => entry.id === record.equipmentId);
            if (item) {
                item.status = "Available";
                save(KEYS.equipment, equipment);
            }

            form.reset();
            notify(`${record.equipment} return recorded.`);
            renderEquipmentTables();
            location.reload();
        });
    }

    function init() {
        if (!localStorage.getItem(KEYS.equipment)) {
            save(KEYS.equipment, starterEquipment);
        }

        renderEquipmentTables();
        bindBorrowPage();
        bindManagePage();
        bindSearch();
        bindRecordsPage();
        bindReturnPage();
    }

    document.addEventListener("DOMContentLoaded", init);
})();
async function loadAppData() {
    const savedEquipment = localStorage.getItem("muniEquipment");
    const savedRecords = localStorage.getItem("muniBorrowRecords");

    if (savedEquipment && savedRecords) {
        return {
            equipment: JSON.parse(savedEquipment),
            borrowRecords: JSON.parse(savedRecords)
        };
    }

    const response = await fetch("data.json");
    if (!response.ok) {
        throw new Error("Could not load data.json");
    }

    const sampleData = await response.json();

    localStorage.setItem("muniEquipment", JSON.stringify(sampleData.equipment));
    localStorage.setItem("muniBorrowRecords", JSON.stringify(sampleData.borrowRecords));

    return sampleData;
}
const CONDITION_NONE = "Not recorded";

const starterEquipment = [
    { id: "dell-laptop", name: "Dell Laptop", category: "Laptop", condition: "Good", status: "Available" },
    { id: "projector", name: "Projector", category: "Projector", condition: "Good", status: "Available" },
    { id: "microphone", name: "Microphone", category: "Audio equipment", condition: "Good", status: "Available" },
    { id: "printer", name: "Printer", category: "Other", condition: "Good", status: "Available" },
    { id: "camera", name: "Camera", category: "Camera", condition: "In repair", status: "In repair" }
];

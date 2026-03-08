export const generateMedicineDetails = (medicineName, category) => {
    return {
        description: `${medicineName} is commonly used to treat conditions related to ${category}. It helps reduce symptoms and improve patient comfort.`,

        stripDetails: "10 tablets per strip (may vary by manufacturer)",

        usage: `Used for treatment related to ${category}`,

        effectTime: "Usually starts working within 30–60 minutes depending on body response",

        dosageNote: "Take with water after food unless advised differently by a doctor",

        caution: "Do not exceed recommended dosage. Consult doctor if symptoms persist."
    };
};

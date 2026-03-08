/**
 * Calculates the Levenshtein distance between two strings.
 * Used for typo tolerance and fuzzy matching.
 */
export const getLevenshteinDistance = (a, b) => {
    const matrix = [];

    // Increment along the first column of each row
    for (let i = 0; i <= b.length; i++) {
        matrix[i] = [i];
    }

    // Increment each column in the first row
    for (let j = 0; j <= a.length; j++) {
        matrix[0][j] = j;
    }

    // Fill in the rest of the matrix
    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1, // substitution
                    Math.min(
                        matrix[i][j - 1] + 1, // insertion
                        matrix[i - 1][j] + 1  // deletion
                    )
                );
            }
        }
    }

    return matrix[b.length][a.length];
};

/**
 * Determines if two strings are a fuzzy match based on a threshold.
 */
export const isFuzzyMatch = (target, query, threshold = 2) => {
    if (!target || !query) return false;
    const t = target.toLowerCase();
    const q = query.toLowerCase();

    // Direct inclusion or prefix match (very common)
    if (t.includes(q)) return true;

    // Levenshtein distance check for typos
    const distance = getLevenshteinDistance(t, q);

    // Dynamic threshold based on length to avoid false positives for short strings
    const dynamicThreshold = q.length <= 4 ? 1 : threshold;

    return distance <= dynamicThreshold;
};

// User Search Schema Interface
interface UserSearchSchema {
    wallet: string;
    name: string;
    // Additional properties can be added here based on onboarding form
    // Example: email?: string, profileImage?: string, etc.
    prompt: {
        // Basic Search Filters
        targetRole: string;
        searchQuery: string;
        purpose: string;
        location: string;
        experience: string;
        skills: string[];

        // Advanced filters
        workType: string;
        availability: string;
        urgency: string;
        remotePreference: string;
        collaborationType: string;
        timeZone: string;

        // Target role based filters
        // These would be specific filters based on the target role
        // Example: for developers - techStack, for designers - designTools, etc.
        roleSpecificFilters?: Record<string, any>;
    };
}

// Alternative: If this is meant to be an object literal instead of an interface
const userSearchObject = {
    wallet: "",
    name: "",
    // Other properties would be defined here based on user onboarding
    prompt: {
        // Basic Search Filters
        targetRole: "",
        searchQuery: "",
        purpose: "",
        location: "",
        experience: "",
        skills: [],

        // Advanced filters
        workType: "",
        availability: "",
        urgency: "",
        remotePreference: "",
        collaborationType: "",
        timeZone: "",

        // Target role based filters would be added dynamically
        roleSpecificFilters: {}

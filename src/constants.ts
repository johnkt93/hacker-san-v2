// only way to do this I could think of
export interface Class<T> extends Function { 
    new (...args: any[]): T;  
}

export type Platform = "youtube" | "twitter";
export const SUPPORTED_PLATFORMS: Platform[] = ["youtube", "twitter"];
export const PLATFORM_NAME_LOOKUP: {[Property in Platform]: string} = {
    youtube: "YouTube",
    twitter: "Twitter",
};

// TODO: Split offline into seperate stream:offline and channel:offline events.
export type Event = "live" | "upload" | "offline" | "upcoming" | "post";
export const EVENT_NAME_LOOKUP: {[Property in Event]: string} = {
    live: "Live",
    upload: "Upload",
    offline: "Offline",
    upcoming: "Upcoming",
    post: "Post",
};
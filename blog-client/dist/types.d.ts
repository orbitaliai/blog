export interface BlogClientConfig {
    owner?: string;
    repo?: string;
    branch?: string;
    contentDir?: string;
    baseUrl?: string;
    fetch?: typeof fetch;
    fetchOptions?: RequestInit;
}
export interface TOCEntry {
    title: string;
    image: string;
    brief: string;
    slug: string;
    date: string;
}
export interface BlogPost {
    title: string;
    image: string;
    content: string;
}

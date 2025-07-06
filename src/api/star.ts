import createRequest from "./base";

export const selectAllStar = createRequest<any, any>("select_all_star", true);

export const starMovie = createRequest<{ star: any }, any>("star_movie", true);

export const deleteStar = createRequest<{ id: string }, any>("delete_star", true);

export const importStar = createRequest<{ filePath: string }, any>("import_star", true);

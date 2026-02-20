export interface ParsedPGN {
    hash: string;
    pgn: string;
    white: string;
    black: string;
    date: string;
    result: string;
    event: string;
}


export const hashPGN = (pgn: string): string => {
    let hash = 0;
    for (let i = 0; i < pgn.length; i++) {
        const char = pgn.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
};


export const extractPGNInfo = (pgn: string): Omit<ParsedPGN, 'hash' | 'pgn'> => {
    const white = pgn.match(/\[White "([^"]+)"\]/)?.[1] || "Unknown";
    const black = pgn.match(/\[Black "([^"]+)"\]/)?.[1] || "Unknown";
    const date = pgn.match(/\[Date "([^"]+)"\]/)?.[1] || "Unknown";
    const result = pgn.match(/\[Result "([^"]+)"\]/)?.[1] || "*";
    const event = pgn.match(/\[Event "([^"]+)"\]/)?.[1] || "Casual Game";
    
    return { white, black, date, result, event };
};


export const splitPGNs = (content: string): string[] => {
    const pgns: string[] = [];
    const lines = content.split('\n');
    let currentPGN: string[] = [];
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
       
        if (line.startsWith('[Event') && currentPGN.length > 0) {
            pgns.push(currentPGN.join('\n').trim());
            currentPGN = [line];
        } else if (line) {
            currentPGN.push(line);
        }
    }
    
 
    if (currentPGN.length > 0) {
        pgns.push(currentPGN.join('\n').trim());
    }
    
    return pgns.filter(pgn => pgn.length > 0);
};

export const getResultColor = (result: string) => {
    if (result === "1-0") return "success";
    if (result === "0-1") return "error";
    if (result === "1/2-1/2") return "warning";
    return "default";
};

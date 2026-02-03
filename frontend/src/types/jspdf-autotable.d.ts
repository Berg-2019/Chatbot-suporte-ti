declare module 'jspdf-autotable' {
    import { jsPDF } from 'jspdf';

    export interface AutoTableOptions {
        startY?: number;
        head?: string[][];
        body?: string[][];
        theme?: 'striped' | 'grid' | 'plain';
        headStyles?: { fillColor?: number[] | string };
        // Add other options as needed
    }

    export default function autoTable(doc: jsPDF, options: AutoTableOptions): void;
}

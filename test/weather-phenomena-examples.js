/**
 * Weather Phenomena Parsing Examples
 * 
 * Test cases for different ISCS (현상) patterns from ASOS data
 */

import { AsosDalyInfoService } from '../kma/AsosDalyInfoService.js';

const asosDalyService = new AsosDalyInfoService();

// Test cases based on real data
const testCases = [
    {
        name: "Complex rain with intensities",
        input: "{비}0005-{비}{강도2}0300-{비}{강도1}0600-{비}{강도0}0900-{비}{강도0}1200-{안개비}1320-1420. {박무}0750-{박무}{강도0}0900-0935. {비}1505-{비}{강도0}1800-{비}{강도0}2100-{비}{강도1}2400-"
    },
    {
        name: "Simple shower",
        input: "{소나기}1650-1725."
    },
    {
        name: "Multiple brief rain periods",
        input: "{비}0620-0655. {비}0740-0750. {소나기}1005-1020."
    },
    {
        name: "Snow periods",
        input: "{눈}0450-0505. {눈}1043-1048."
    },
    {
        name: "Current test data",
        input: "{비}1145-{비}{강도0}1200-{비}{강도0}1500-{비}{강도0}1800-{비}{강도0}2100-{비}{강도0}2400- {박무}1925-2010. {박무}2110-2235."
    }
];

console.log("=== Weather Phenomena Parsing Test Results ===\n");

testCases.forEach((testCase, index) => {
    console.log(`${index + 1}. ${testCase.name}`);
    console.log(`Input: ${testCase.input}`);
    
    const parsed = asosDalyService.parseWeatherPhenomena(testCase.input);
    
    console.log("Parsed phenomena:");
    parsed.forEach((phenomenon, idx) => {
        const duration = phenomenon.duration ? `${phenomenon.duration}분` : '지속중';
        const intensity = phenomenon.intensity ? ` (${phenomenon.intensity})` : '';
        console.log(`  ${idx + 1}. ${phenomenon.phenomenon}${intensity}: ${phenomenon.startTime}-${phenomenon.endTime || '계속'} (${duration})`);
    });
    
    console.log(""); // Empty line for spacing
});
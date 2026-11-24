import { use } from "react";
import { getUserDataFromBlockchain } from "@/lib/blockchain";

export const getSuperAgent = async (userData: any) => {
  try {
    const response = await fetch(
      "https://97919ab93b03.ngrok-free.app/api/v1/userDetails",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(userData),
      }
    );
    
    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching super agent data:", error);
    throw error;
  }
};

export const generateSuperAgentParam = async (searchFilters: any, publicKey: string) => {
  const userData = await getUserDataFromBlockchain(publicKey);
  if (!userData) {
    throw new Error("User data not found for the provided public key");
  }
  // overwrite userData with searchFilters

  userData.seeking = searchFilters.role;
  userData.wallet = publicKey;
  
  const obj = {
    user: { ...userData }
  };
  
  console.log("Super Agent Param:", obj);
  
  return obj;
}
          
// user: {
//           wallet: "0xe8d4ce5de77d3b1195243282dfea0e542b28c9ea",
//           role: "founder",
//           name: "Johnathan Franco",
//           startupName: "ChainMed Solutions",
//           stage: "Revenue-generating",
//           domain: ["HealthTech", "Blockchain"],
//           biggestChallenge: "Market Access",
//           collaboratorsNeeded: ["Investors", "Technical Experts"],
//           seeking: "Investments",
//           growthGoals12m: "Enter 3 new regional markets and hire sales team.",
//           interestedInAccel: false,
//           preferredModel: "Revenue-share",
//           techStack: ["Node.js", "React"],
//           fundingNeededUSD: 465244,
//           hiringNeeds: ["backend", "frontend"],
//           location: "New York",
//           previousSupportUsed: ["Incubator"],
//           productType: "Marketplace",
//           coFounderNeed: true,
//           fundraisingStage: "series A",
//           tractionSummary:
//             "Secured letters of intent from 5 enterprise clients.",
//           prompt: "fucking prompt",
//         },

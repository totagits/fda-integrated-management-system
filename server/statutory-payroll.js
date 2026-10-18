import { parseMinorUnits } from './domain.js';
import { fail } from './departments.js';
const rate=v=>{const n=Number(v);if(!Number.isInteger(n)||n<0||n>10000)throw fail('Rates must be whole basis points between 0 and 10000.');return n;};
export function parseBands(input){
 const lines=String(input||'').trim().split('\n');if(lines.length<2||lines.length>20)throw fail('Enter 2–20 annual LRD tax bands.');
 let lower=0n,lastRate=-1;
 return lines.map((line,i)=>{const parts=line.split(',').map(s=>s.trim());if(parts.length!==2)throw fail('Use annual upper limit, basis points; use ABOVE for the last limit.');const upper=parts[0]==='ABOVE'?null:parseMinorUnits(parts[0]);if((upper===null)!==(i===lines.length-1)||upper!==null&&upper<=lower)throw fail('Bands must increase and end with ABOVE.');const bps=rate(parts[1]);if(bps<lastRate)throw fail('Marginal tax rates cannot decrease between bands.');lastRate=bps;const band={lower:lower.toString(),upper:upper?.toString()??null,bps};if(upper!==null)lower=upper;return band;});
}
const rounded=(n,d)=>(n+d/2n)/d;
export function calculateStatutory(policy,input){
 const gross=parseMinorUnits(input.gross),taxable=parseMinorUnits(input.taxable),benefits=parseMinorUnits(input.nonCashBenefits||'0'),pensionable=parseMinorUnits(input.pensionable),other=parseMinorUnits(input.other||'0');
 if(gross<=0n||pensionable>gross)throw fail('Gross must be positive; pensionable earnings cannot exceed gross cash pay.');
 // Separate taxable basis supports approved taxable benefits; exclusions require a recorded basis reference.
 if(!/^(?:0|[1-9]\d{0,6})(?:\.\d{1,6})?$/.test(String(input.fx)))throw fail('Enter an approved LRD-per-pay-currency rate with at most six decimals.');
 const [whole,fraction='']=String(input.fx).split('.'),fx=BigInt(whole)*1000000n+BigInt(fraction.padEnd(6,'0'));
 if(fx<=0n||input.currency==='LRD'&&fx!==1000000n)throw fail('LRD payroll must use an exchange rate of 1.');
 if(!['USD','LRD'].includes(input.currency))throw fail('Unsupported currency.');
 if(benefits<0n||benefits>taxable)throw fail('Taxable benefits must be non-negative and within the approved taxable earnings base.');
 const benefitExemption=BigInt(policy.non_cash_exemption_lrd_minor||0),annualBenefits=rounded(benefits*fx*12n,1000000n),annualBeforeExemption=rounded(taxable*fx*12n,1000000n),annual=annualBeforeExemption-(annualBenefits<benefitExemption?annualBenefits:benefitExemption);let taxNumerator=0n;
 for(const b of policy.bands){const lower=BigInt(b.lower),upper=b.upper===null?annual:BigInt(b.upper);if(annual>lower)taxNumerator+=( (annual<upper?annual:upper)-lower)*BigInt(rate(b.bps));}
 // Round only after annualization and currency conversion; half-up in pay-currency cents.
 const paye=rounded(taxNumerator*1000000n,10000n*12n*fx);
 const employee=rounded(pensionable*BigInt(rate(policy.employee_bps)),10000n),employerPension=rounded(pensionable*BigInt(rate(policy.employer_bps)),10000n),injury=rounded(pensionable*BigInt(rate(policy.injury_bps)),10000n);
 const deductions=paye+employee+other;if(deductions>=gross)throw fail('Calculated deductions leave no positive net cash pay. Review benefits and bases.');
 return Object.fromEntries(Object.entries({gross,taxable,pensionable,other,paye,employee,employerPension,injury,deductions,net:gross-deductions,annualTaxableLrd:annual,annualBenefitsLrd:annualBenefits,benefitExemptionAppliedLrd:(annualBenefits<benefitExemption?annualBenefits:benefitExemption),fxMillionths:fx}).map(([k,v])=>[k,v.toString()]));
}

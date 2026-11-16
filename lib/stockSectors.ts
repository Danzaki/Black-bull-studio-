export type Sector = 'tech' | 'crypto' | 'finance' | 'energy' | 'health' | 'consumer' | 'etf' | 'other';

export const SECTOR_LABEL: Record<Sector, string> = {
  tech: 'Tech', crypto: 'Crypto', finance: 'Finance', energy: 'Energy',
  health: 'Health', consumer: 'Consumer', etf: 'ETFs', other: 'Other',
};

const MAP: Record<Sector, string[]> = {
  tech: ['AAPL','MSFT','GOOGL','GOOG','AMZN','META','NVDA','AMD','INTC','TSM','AVGO','ORCL','CRM','ADBE','NFLX','SNDK','MU','QCOM','PLTR','SNOW','UBER','SHOP','NOW','CSCO','IBM','ASML','ARM','SMCI','DELL','HPQ','TXN','AMAT','LRCX','PANW','CRWD','NET','DDOG','RBLX','U','SPOT','PYPL','SQ','XYZ'],
  crypto: ['COIN','MSTR','HOOD','MARA','RIOT','CLSK','HUT','BMNR','CRCL','GLXY','BTBT','CORZ','IREN','WULF','SBET','GME'],
  finance: ['JPM','BAC','WFC','GS','MS','C','V','MA','AXP','BRK.B','BRKB','BLK','SCHW','USB','PNC'],
  energy: ['XOM','CVX','COP','OXY','SLB','EOG','PSX','MPC','VLO','OKLO','SMR','CEG','VST','NEE','ENPH','FSLR','LEU','CCJ'],
  health: ['JNJ','PFE','LLY','UNH','MRK','ABBV','TMO','ABT','AMGN','GILD','HIMS','NVO','MRNA','BMY'],
  consumer: ['TSLA','WMT','COST','HD','NKE','SBUX','MCD','KO','PEP','DIS','TGT','LULU','CMG','BABA','F','GM','ABNB','BKNG','RIVN','LCID'],
  etf: ['SPY','QQQ','IWM','DIA','VOO','VTI','GLD','SLV','TLT','IBIT','ETHA','ARKK','XLF','XLE','XLK','SMH','SOXX','VXX'],
  other: [],
};

const LOOKUP = new Map<string, Sector>();
(Object.keys(MAP) as Sector[]).forEach((k) => MAP[k].forEach((t) => LOOKUP.set(t, k)));

export function sectorOf(ticker: string): Sector {
  return LOOKUP.get(ticker.toUpperCase()) ?? 'other';
}

import apiClient from '../apiClient';

// Confirmed against ehsibly-frontend/src/services/bank/bankReportsService.js
// and its consumer BankReports.js. Response shape: { summary: {...7
// counts}, overviewBar: {labels, data: [total,accepted,executed,bawales,
// pending,notStarted,rejected]}, overviewLine: {labels, datasets: {...7
// same-named time series}}, bawalesBar: {labels, data: [total,rejected,
// accepted,pending]}, profitLine: {labels, datasets: {USD,EUR,AED}} }.
export const getBankReportsAnalytics = async ({period, year, month, date, startDate, endDate} = {}) => {
  const response = await apiClient.get('bankReports/analytics', {
    params: {period, year, month, date, startDate, endDate},
  });
  return response.data;
};

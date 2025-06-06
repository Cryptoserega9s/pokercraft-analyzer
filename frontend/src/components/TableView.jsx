import React from 'react';
import { useTranslation } from 'react-i18next';

// Компоненты вынесены для чистоты
const PaginationButton = ({ page, currentPage, onClick, children, isDisabled = false }) => (
    <button
        className={`pagination-btn ${currentPage === page ? 'active' : ''}`}
        onClick={() => onClick(page)}
        disabled={isDisabled || currentPage === page}
    >
        {children || page}
    </button>
);

const PerPageSelector = ({ value, onChange }) => (
    <div className="per-page-selector">
        <span>Показывать по:</span>
        <select value={value} onChange={onChange}>
            <option value="10">10</option>
            <option value="25">25</option>
            <option value="50">50</option>
            <option value="100">100</option>
        </select>
    </div>
);


function TableView({ tournaments, sort, onSort, pagination, onPageChange, tournamentsPerPage, onPerPageChange }) {
    const { t } = useTranslation();

    const renderSortArrow = (field) => {
        if (sort.field !== field) return null;
        return <span className="sort-arrow">{sort.direction === 'asc' ? '▲' : '▼'}</span>;
    };
    
    const formatDate = (dateString) => {
        if (!dateString) return ' - ';
        const date = new Date(dateString);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${day}.${month}.${year} ${hours}:${minutes}`;
    };

    const getRowClass = (place) => {
        if (!place) return '';
        if (place <= 3) return 'place-top3';
        if (place >= 4 && place <= 8) return 'place-top8';
        return '';
    };

    const renderPagination = () => {
        const { currentPage, totalPages } = pagination;
        if (totalPages <= 1) return null;
        
        const pages = [];
        const pageLimit = 5; 
        let startPage = Math.max(1, currentPage - 2);
        let endPage = Math.min(totalPages, currentPage + 2);

        if (currentPage <= 3) {
            endPage = Math.min(totalPages, pageLimit);
        }
        if (currentPage > totalPages - 3) {
            startPage = Math.max(1, totalPages - pageLimit + 1);
        }

        // --- ИСПРАВЛЕНИЕ ЗДЕСЬ ---
        pages.push(<PaginationButton key="prev" onClick={() => onPageChange(currentPage - 1)} isDisabled={currentPage === 1}>‹</PaginationButton>);
        
        if (startPage > 1) {
            pages.push(<PaginationButton key={1} page={1} currentPage={currentPage} onClick={onPageChange} />);
            if (startPage > 2) {
                pages.push(<span key="start-ellipsis" className="pagination-ellipsis">...</span>);
            }
        }

        for (let i = startPage; i <= endPage; i++) {
            pages.push(<PaginationButton key={i} page={i} currentPage={currentPage} onClick={onPageChange} />);
        }

        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                pages.push(<span key="end-ellipsis" className="pagination-ellipsis">...</span>);
            }
            pages.push(<PaginationButton key={totalPages} page={totalPages} currentPage={currentPage} onClick={onPageChange} />);
        }

        // --- И ИСПРАВЛЕНИЕ ЗДЕСЬ ---
        pages.push(<PaginationButton key="next" onClick={() => onPageChange(currentPage + 1)} isDisabled={currentPage === totalPages}>›</PaginationButton>);

        return pages;
    };

    return (
        <div className="table-section">
            <div className="tournament-table-container">
                <table className="tournament-table">
                    <thead>
                        <tr>
                            <th onClick={() => onSort('start_time')}>{t('dashboard.table.date')}{renderSortArrow('start_time')}</th>
                            <th onClick={() => onSort('buyin_total')}>{t('dashboard.table.buyin')}{renderSortArrow('buyin_total')}</th>
                            <th onClick={() => onSort('prize_total')}>{t('dashboard.table.prize')}{renderSortArrow('prize_total')}</th>
                            <th onClick={() => onSort('prize_bounty')}>{t('dashboard.table.bounty')}{renderSortArrow('prize_bounty')}</th>
                            <th onClick={() => onSort('finish_place')}>{t('dashboard.table.place')}{renderSortArrow('finish_place')}</th>
                            <th onClick={() => onSort('kills')}>{t('dashboard.table.kills')}{renderSortArrow('kills')}</th>
                            <th onClick={() => onSort('duration')}>{t('dashboard.table.duration')}{renderSortArrow('duration')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {tournaments.map(t => (
                            <tr key={t.id} className={getRowClass(t.finish_place)}>
                                <td>{formatDate(t.start_time)}</td>
                                <td>${(t.buyin_total || 0).toFixed(2)}</td>
                                <td>${(t.prize_total || 0).toFixed(2)}</td>
                                <td>${(t.prize_bounty || 0).toFixed(2)}</td>
                                <td>{t.finish_place || '-'}</td>
                                <td>{t.kills !== null ? t.kills : '-'}</td>
                                <td>{t.duration ? t.duration : ' - '}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            
            {pagination.totalPages > 0 && (
                <div className="table-controls">
                    <PerPageSelector value={tournamentsPerPage} onChange={onPerPageChange} />
                    <div className="pagination">
                        {renderPagination()}
                    </div>
                </div>
            )}
        </div>
    );
}

export default TableView;
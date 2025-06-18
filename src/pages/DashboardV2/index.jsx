import { useEffect, useState } from "react";
import {
  MessageSquareText,
  Send,
  Users,
  TrendingUp,
  BarChart3,
  Activity,
  Calendar,
  Clock,
  RefreshCw,
  Filter,
  ChevronDown,
  Infinity,
  CalendarDays,
  CalendarRange,
  CalendarClock,
  CalendarCheck,
  Settings
} from "lucide-react";

const { ipcRenderer } = window.require("electron");

/**
 * @typedef {Object} AggregatedMetrics
 * @property {number} totalMessagesReceived
 * @property {number} totalMessagesSent
 * @property {number} totalFollowUpsSent
 * @property {number} totalInstances
 * @property {string} lastUpdated
 * @property {string} period
 */

/**
 * Modal com dois calendários lado a lado para período personalizado
 */
const CustomDateRangeModal = ({ isOpen, onClose, startDate, endDate, onDateChange }) => {
  const [tempStartDate, setTempStartDate] = useState(startDate || '');
  const [tempEndDate, setTempEndDate] = useState(endDate || '');

  useEffect(() => {
    if (isOpen) {
      setTempStartDate(startDate || '');
      setTempEndDate(endDate || '');
    }
  }, [isOpen, startDate, endDate]);

  const handleApply = () => {
    if (tempStartDate && tempEndDate) {
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      const startDateObj = new Date(tempStartDate);
      const endDateObj = new Date(tempEndDate);
      
      if (startDateObj <= today && endDateObj <= today && startDateObj <= endDateObj) {
        onDateChange(tempStartDate, tempEndDate);
        onClose();
      }
    }
  };

  const today = new Date().toISOString().split('T')[0];
  const isValidRange = tempStartDate && tempEndDate && tempStartDate <= tempEndDate && 
                      new Date(tempStartDate) <= new Date(today) && new Date(tempEndDate) <= new Date(today);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-4xl bg-gradient-to-br from-dashboardCard to-dashboardBg border border-primaryColor/30 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-primaryColor/20 to-dashboardAccent/20 px-6 py-4 border-b border-primaryColor/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CalendarRange className="w-5 h-5 text-primaryColor" />
              <h2 className="text-lg font-semibold text-white">Selecionar Período</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-primaryColor/20 transition-colors"
            >
              <ChevronDown className="w-4 h-4 text-gray-400 rotate-45" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Campos de entrada manual */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
                <CalendarDays className="w-4 h-4 text-blue-400" />
                Data Inicial
              </label>
              <input
                type="date"
                value={tempStartDate}
                onChange={(e) => setTempStartDate(e.target.value)}
                max={today}
                className="
                  w-full px-4 py-3 bg-dashboardBg/70 border border-primaryColor/30 
                  rounded-lg text-white placeholder-gray-400
                  focus:border-primaryColor focus:ring-2 focus:ring-primaryColor/20 
                  focus:outline-none transition-all duration-200
                  hover:border-primaryColor/50
                  [color-scheme:dark]
                "
                style={{
                  colorScheme: 'dark'
                }}
              />
            </div>
            
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
                <CalendarCheck className="w-4 h-4 text-green-400" />
                Data Final
              </label>
              <input
                type="date"
                value={tempEndDate}
                onChange={(e) => setTempEndDate(e.target.value)}
                max={today}
                min={tempStartDate}
                className="
                  w-full px-4 py-3 bg-dashboardBg/70 border border-primaryColor/30 
                  rounded-lg text-white placeholder-gray-400
                  focus:border-primaryColor focus:ring-2 focus:ring-primaryColor/20 
                  focus:outline-none transition-all duration-200
                  hover:border-primaryColor/50
                  [color-scheme:dark]
                "
                style={{
                  colorScheme: 'dark'
                }}
              />
            </div>
          </div>

          {/* Preview do período selecionado */}
          {tempStartDate && tempEndDate && isValidRange && (
            <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-3">
                <CalendarCheck className="w-5 h-5 text-green-400" />
                <div>
                  <p className="text-green-100 font-medium">
                    {new Date(tempStartDate).toLocaleDateString('pt-BR')} até {new Date(tempEndDate).toLocaleDateString('pt-BR')}
                  </p>
                  <p className="text-green-200 text-sm">
                    {Math.ceil((new Date(tempEndDate) - new Date(tempStartDate)) / (1000 * 60 * 60 * 24)) + 1} dias selecionados
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Validação visual */}
          {tempStartDate && tempEndDate && !isValidRange && (
            <div className="bg-gradient-to-r from-red-500/10 to-pink-500/10 border border-red-500/20 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-red-400" />
                <div>
                  <p className="text-red-100 font-medium">Período Inválido</p>
                  <p className="text-red-200 text-sm">
                    Verifique se a data final é posterior à data inicial e se não são datas futuras.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="
                flex-1 px-6 py-3 bg-gray-600/30 text-gray-300 rounded-lg 
                hover:bg-gray-600/50 transition-all duration-200
                border border-gray-600/30 hover:border-gray-500/50
                font-medium
              "
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleApply}
              disabled={!isValidRange}
              className="
                flex-1 px-6 py-3 bg-gradient-to-r from-primaryColor to-dashboardAccent 
                text-white rounded-lg font-medium transition-all duration-200
                hover:from-primaryColor/90 hover:to-dashboardAccent/90 
                disabled:opacity-50 disabled:cursor-not-allowed
                shadow-lg hover:shadow-glow disabled:hover:shadow-none
              "
            >
              {isValidRange ? 'Aplicar Período' : 'Selecione as Datas'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Componente de calendário customizado
 */
const CustomDatePicker = ({ value, onChange, maxDate, minDate, label, icon: Icon, placeholder, embedded = false, theme = 'default' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(value ? new Date(value) : new Date());

  const today = new Date();
  today.setHours(0, 0, 0, 0); // Início do dia atual
  const selectedDate = value ? new Date(value) : null;

  // Temas de cores
  const themes = {
    default: {
      headerBg: 'bg-gradient-to-r from-primaryColor/20 to-dashboardAccent/20',
      borderColor: 'border-primaryColor/20',
      buttonBg: 'bg-primaryColor/20',
      buttonText: 'text-primaryColor',
      buttonBorder: 'border-primaryColor/50',
      buttonHover: 'hover:bg-primaryColor/10',
      selectedBg: 'bg-gradient-to-r from-primaryColor to-dashboardAccent',
      todayBg: 'bg-primaryColor/20',
      todayText: 'text-primaryColor',
      todayBorder: 'border-primaryColor/50',
      dotBg: 'bg-primaryColor'
    },
    blue: {
      headerBg: 'bg-gradient-to-r from-blue-500/20 to-blue-600/20',
      borderColor: 'border-blue-500/20',
      buttonBg: 'bg-blue-500/20',
      buttonText: 'text-blue-400',
      buttonBorder: 'border-blue-500/50',
      buttonHover: 'hover:bg-blue-500/10',
      selectedBg: 'bg-gradient-to-r from-blue-500 to-blue-600',
      todayBg: 'bg-blue-500/20',
      todayText: 'text-blue-400',
      todayBorder: 'border-blue-500/50',
      dotBg: 'bg-blue-500'
    },
    green: {
      headerBg: 'bg-gradient-to-r from-green-500/20 to-green-600/20',
      borderColor: 'border-green-500/20',
      buttonBg: 'bg-green-500/20',
      buttonText: 'text-green-400',
      buttonBorder: 'border-green-500/50',
      buttonHover: 'hover:bg-green-500/10',
      selectedBg: 'bg-gradient-to-r from-green-500 to-green-600',
      todayBg: 'bg-green-500/20',
      todayText: 'text-green-400',
      todayBorder: 'border-green-500/50',
      dotBg: 'bg-green-500'
    }
  };

  const currentTheme = themes[theme] || themes.default;

  // Fecha o calendário quando clicar fora (apenas se não for embedded)
  useEffect(() => {
    if (!embedded) {
      const handleClickOutside = (event) => {
        const calendarElement = event.target.closest('[data-custom-calendar]');
        if (!calendarElement && isOpen) {
          setIsOpen(false);
        }
      };

      if (isOpen) {
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
      }
    }
  }, [isOpen, embedded]);

  // Gera os dias do mês
  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    
    // Dias vazios do início
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Dias do mês
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }
    
    return days;
  };

  const handleDateSelect = (date) => {
    const dateString = date.toISOString().split('T')[0];
    onChange(dateString);
    if (!embedded) {
      setIsOpen(false);
    }
  };

  const isDateDisabled = (date) => {
    if (!date) return true;
    
    // Não permite datas futuras (após hoje)
    const dateToCheck = new Date(date);
    dateToCheck.setHours(0, 0, 0, 0);
    const todayCheck = new Date();
    todayCheck.setHours(0, 0, 0, 0);
    
    if (dateToCheck > todayCheck) return true;
    
    // Verifica outras restrições
    if (maxDate && date > new Date(maxDate)) return true;
    if (minDate && date < new Date(minDate)) return true;
    return false;
  };

  const formatDisplayDate = (dateString) => {
    if (!dateString) return placeholder || 'Selecionar data';
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const navigateMonth = (direction) => {
    setCurrentMonth(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + direction);
      return newDate;
    });
  };

  const canNavigatePrevious = () => {
    const prevMonth = new Date(currentMonth);
    prevMonth.setMonth(currentMonth.getMonth() - 1);
    prevMonth.setDate(1);
    
    if (minDate) {
      const minDateObj = new Date(minDate);
      minDateObj.setDate(1);
      return prevMonth >= minDateObj;
    }
    return true;
  };

  const canNavigateNext = () => {
    const nextMonth = new Date(currentMonth);
    nextMonth.setMonth(currentMonth.getMonth() + 1);
    nextMonth.setDate(1);
    
    // Não permite navegar para meses futuros
    const todayMonth = new Date();
    todayMonth.setDate(1);
    
    if (nextMonth > todayMonth) return false;
    
    if (maxDate) {
      const maxDateObj = new Date(maxDate);
      maxDateObj.setDate(1);
      return nextMonth <= maxDateObj;
    }
    return true;
  };

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  // Se for embedded, mostra apenas o calendário
  if (embedded) {
    return (
      <div className="w-full" data-custom-calendar>
        <div className="w-full bg-gradient-to-br from-dashboardBg/60 to-dashboardCard/30 border border-primaryColor/20 rounded-2xl overflow-hidden backdrop-blur-sm shadow-lg">
          {/* Header do calendário */}
          <div className={`${currentTheme.headerBg} px-6 py-4 border-b ${currentTheme.borderColor}`}>
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => navigateMonth(-1)}
                disabled={!canNavigatePrevious()}
                className={`p-2 rounded-xl ${currentTheme.buttonHover} transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed group`}
              >
                <ChevronDown className={`w-5 h-5 ${currentTheme.buttonText} rotate-90 group-hover:scale-110 transition-transform duration-200`} />
              </button>
              
              <h3 className="text-white font-bold text-lg">
                {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
              </h3>
              
              <button
                type="button"
                onClick={() => navigateMonth(1)}
                disabled={!canNavigateNext()}
                className={`p-2 rounded-xl ${currentTheme.buttonHover} transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed group`}
              >
                <ChevronDown className={`w-5 h-5 ${currentTheme.buttonText} -rotate-90 group-hover:scale-110 transition-transform duration-200`} />
              </button>
            </div>
          </div>

          {/* Calendário */}
          <div className="p-6">
            {/* Dias da semana */}
            <div className="grid grid-cols-7 gap-2 mb-4">
              {dayNames.map(day => (
                <div key={day} className="text-center text-sm font-semibold text-gray-400 py-2">
                  {day}
                </div>
              ))}
            </div>

            {/* Dias do mês */}
            <div className="grid grid-cols-7 gap-2">
              {getDaysInMonth(currentMonth).map((date, index) => {
                if (!date) {
                  return <div key={index} className="h-10" />;
                }

                const isSelected = selectedDate && date.toDateString() === selectedDate.toDateString();
                const isToday = date.toDateString() === today.toDateString();
                const isDisabled = isDateDisabled(date);

                return (
                  <button
                    key={index}
                    type="button"
                    onClick={() => !isDisabled && handleDateSelect(date)}
                    disabled={isDisabled}
                    className={`
                      h-10 w-10 rounded-xl text-sm font-semibold transition-all duration-200 relative
                      ${isSelected 
                        ? `${currentTheme.selectedBg} text-white shadow-lg transform scale-110` 
                        : isToday
                        ? `${currentTheme.todayBg} ${currentTheme.todayText} border-2 ${currentTheme.todayBorder} font-bold`
                        : isDisabled
                        ? 'text-gray-600 cursor-not-allowed opacity-50'
                        : `text-gray-300 ${currentTheme.buttonHover} hover:text-white hover:scale-105 hover:shadow-md`
                      }
                    `}
                  >
                    {date.getDate()}
                    {isToday && !isSelected && (
                      <div className={`absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 ${currentTheme.dotBg} rounded-full`}></div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Footer com ações rápidas */}
            <div className="flex justify-between items-center mt-6 pt-4 border-t border-primaryColor/20">
              <button
                type="button"
                onClick={() => onChange('')}
                className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-gray-600/20"
              >
                Limpar
              </button>
              <button
                type="button"
                onClick={() => {
                  const todayString = today.toISOString().split('T')[0];
                  if (!isDateDisabled(today)) {
                    onChange(todayString);
                  }
                }}
                disabled={isDateDisabled(today)}
                className={`px-4 py-2 text-sm ${currentTheme.buttonBg} ${currentTheme.buttonText} rounded-lg hover:bg-opacity-75 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium`}
              >
                Hoje
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative" data-custom-calendar>
      {label && (
        <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
          <Icon className="w-4 h-4 text-primaryColor" />
          {label}
        </label>
      )}
      
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="
          w-full px-4 py-3 bg-dashboardBg/70 border border-primaryColor/30 
          rounded-lg text-white text-left
          focus:border-primaryColor focus:ring-2 focus:ring-primaryColor/20 
          focus:outline-none transition-all duration-200
          hover:border-primaryColor/50 flex items-center justify-between
        "
      >
        <span className={value ? 'text-white' : 'text-gray-400'}>
          {formatDisplayDate(value)}
        </span>
        <Calendar className="w-4 h-4 text-primaryColor" />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-80 z-[70] bg-gradient-to-br from-dashboardCard to-dashboardBg border border-primaryColor/30 rounded-xl shadow-2xl backdrop-blur-sm overflow-hidden">
          {/* Header do calendário */}
          <div className={`${currentTheme.headerBg} px-6 py-4 border-b ${currentTheme.borderColor}`}>
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => navigateMonth(-1)}
                disabled={!canNavigatePrevious()}
                className={`p-2 rounded-xl ${currentTheme.buttonHover} transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed group`}
              >
                <ChevronDown className={`w-5 h-5 ${currentTheme.buttonText} rotate-90 group-hover:scale-110 transition-transform duration-200`} />
              </button>
              
              <h3 className="text-white font-bold text-lg">
                {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
              </h3>
              
              <button
                type="button"
                onClick={() => navigateMonth(1)}
                disabled={!canNavigateNext()}
                className={`p-2 rounded-xl ${currentTheme.buttonHover} transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed group`}
              >
                <ChevronDown className={`w-5 h-5 ${currentTheme.buttonText} -rotate-90 group-hover:scale-110 transition-transform duration-200`} />
              </button>
            </div>
          </div>

          {/* Calendário */}
          <div className="p-4">
            {/* Dias da semana */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {dayNames.map(day => (
                <div key={day} className="text-center text-xs font-medium text-gray-400 py-2">
                  {day}
                </div>
              ))}
            </div>

            {/* Dias do mês */}
            <div className="grid grid-cols-7 gap-1">
              {getDaysInMonth(currentMonth).map((date, index) => {
                if (!date) {
                  return <div key={index} className="h-8" />;
                }

                const isSelected = selectedDate && date.toDateString() === selectedDate.toDateString();
                const isToday = date.toDateString() === today.toDateString();
                const isDisabled = isDateDisabled(date);

                return (
                  <button
                    key={index}
                    type="button"
                    onClick={() => !isDisabled && handleDateSelect(date)}
                    disabled={isDisabled}
                    className={`
                      h-8 w-8 rounded-lg text-sm font-medium transition-all duration-200 relative
                      ${isSelected 
                        ? `${currentTheme.selectedBg} text-white shadow-lg transform scale-110` 
                        : isToday
                        ? `${currentTheme.todayBg} ${currentTheme.todayText} border ${currentTheme.todayBorder} font-bold`
                        : isDisabled
                        ? 'text-gray-600 cursor-not-allowed opacity-50'
                        : `text-gray-300 ${currentTheme.buttonHover} hover:text-white hover:scale-105`
                      }
                    `}
                  >
                    {date.getDate()}
                    {isToday && !isSelected && (
                      <div className={`absolute -bottom-0.5 left-1/2 transform -translate-x-1/2 w-1 h-1 ${currentTheme.dotBg} rounded-full`}></div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Footer */}
            <div className="flex justify-between items-center mt-4 pt-3 border-t border-primaryColor/20">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-3 py-1 text-sm text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-gray-600/20"
              >
                Fechar
              </button>
              <button
                type="button"
                onClick={() => {
                  const todayString = today.toISOString().split('T')[0];
                  if (!isDateDisabled(today)) {
                    onChange(todayString);
                    setIsOpen(false);
                  }
                }}
                disabled={isDateDisabled(today)}
                className={`px-3 py-1 text-sm ${currentTheme.buttonBg} ${currentTheme.buttonText} rounded-lg hover:bg-opacity-75 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium`}
              >
                Hoje
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Componente de filtro por período
 */
const PeriodFilter = ({ selectedPeriod, onPeriodChange, isLoading, customDates }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customStartDate, setCustomStartDate] = useState(customDates?.startDate || '');
  const [customEndDate, setCustomEndDate] = useState(customDates?.endDate || '');

  // Atualiza as datas quando as props mudam
  useEffect(() => {
    if (customDates) {
      setCustomStartDate(customDates.startDate || '');
      setCustomEndDate(customDates.endDate || '');
    }
  }, [customDates]);

  // Fecha dropdowns quando clicar fora
  useEffect(() => {
    const handleClickOutside = (event) => {
      const filterElement = event.target.closest('[data-period-filter]');
      if (!filterElement) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const periods = [
    { value: 'today', label: 'Hoje', icon: CalendarDays },
    { value: 'yesterday', label: 'Ontem', icon: CalendarCheck },
    { value: '7d', label: 'Últimos 7 dias', icon: CalendarRange },
    { value: '30d', label: 'Últimos 30 dias', icon: CalendarClock },
    { value: 'all', label: 'Sempre', icon: Infinity },
    { value: 'custom', label: 'Personalizado', icon: Settings }
  ];

  const selectedPeriodData = periods.find(p => p.value === selectedPeriod);
  const SelectedIcon = selectedPeriodData?.icon || Filter;

  const handlePeriodClick = (periodValue) => {
    if (periodValue === 'custom') {
      setShowCustomModal(true);
      setIsOpen(false);
    } else {
      onPeriodChange(periodValue);
      setIsOpen(false);
    }
  };

  const handleCustomDateChange = (startDate, endDate) => {
    setCustomStartDate(startDate);
    setCustomEndDate(endDate);
    onPeriodChange('custom', { startDate, endDate });
  };

  const getDisplayLabel = () => {
    if (selectedPeriod === 'custom' && customStartDate && customEndDate) {
      const start = new Date(customStartDate).toLocaleDateString('pt-BR');
      const end = new Date(customEndDate).toLocaleDateString('pt-BR');
      return `${start} - ${end}`;
    }
    return selectedPeriodData?.label || 'Selecionar período';
  };

  return (
    <>
      <div className="relative" data-period-filter>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          disabled={isLoading}
          className="
            flex items-center gap-3 px-4 py-2 rounded-xl
            bg-gradient-to-r from-dashboardCard/50 to-dashboardBg/30
            border border-primaryColor/30 text-white font-medium
            transition-all duration-300 hover:border-primaryColor/50
            disabled:opacity-50 disabled:cursor-not-allowed
            shadow-lg hover:shadow-glow min-w-[200px]
          "
        >
          <Filter className="w-4 h-4 text-primaryColor" />
          <span className="flex items-center gap-2 flex-1">
            <SelectedIcon className="w-4 h-4 text-gray-300" />
            <span className="truncate">{getDisplayLabel()}</span>
          </span>
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <div className="
            absolute top-full left-0 mt-2 w-full min-w-[220px] z-50
            bg-gradient-to-br from-dashboardCard to-dashboardBg
            border border-primaryColor/30 rounded-xl shadow-2xl
            backdrop-blur-sm
          ">
            {periods.map((period) => {
              const PeriodIcon = period.icon;
              return (
                <button
                  key={period.value}
                  type="button"
                  onClick={() => handlePeriodClick(period.value)}
                  className={`
                    w-full flex items-center gap-3 px-4 py-3 text-left
                    transition-all duration-200 first:rounded-t-xl last:rounded-b-xl
                    ${selectedPeriod === period.value
                      ? 'bg-gradient-to-r from-primaryColor/20 to-dashboardAccent/20 text-primaryColor border-l-2 border-primaryColor'
                      : 'text-gray-300 hover:bg-primaryColor/10 hover:text-white'
                    }
                  `}
                >
                  <PeriodIcon className="w-4 h-4" />
                  <span className="font-medium">{period.label}</span>
                  {selectedPeriod === period.value && (
                    <div className="ml-auto w-2 h-2 bg-primaryColor rounded-full animate-pulse" />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal de período personalizado */}
      <CustomDateRangeModal
        isOpen={showCustomModal}
        onClose={() => setShowCustomModal(false)}
        startDate={customStartDate}
        endDate={customEndDate}
        onDateChange={handleCustomDateChange}
      />
    </>
  );
};

/**
 * Card de métrica individual
 */
const MetricCard = ({
  title,
  value,
  icon: Icon,
  gradient,
  description,
  isLoading,
  period
}) => {
  const getPeriodDescription = () => {
    switch (period) {
      case 'today': return 'hoje';
      case 'yesterday': return 'ontem';
      case '7d': return 'nos últimos 7 dias';
      case '30d': return 'nos últimos 30 dias';
      case 'all': return 'no total';
      case 'custom': return 'no período selecionado';
      default: return 'no total';
    }
  };

  return (
  <div className={`
    relative overflow-hidden rounded-2xl p-6 transition-all duration-300
    border border-primaryColor/20 hover:border-primaryColor/40
    hover:scale-105 hover:shadow-glow group cursor-pointer
    ${gradient}
  `}>
    {/* Efeito de brilho sutil */}
    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 transform -translate-x-full group-hover:translate-x-full" />

    <div className="relative z-10 flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-300 mb-1">{title}</p>
        <p className="text-3xl font-bold text-white mb-2">
          {isLoading ? (
            <div className="w-16 h-8 bg-gray-700 rounded animate-pulse" />
          ) : (
            value?.toLocaleString('pt-BR') || '0'
          )}
        </p>
          <p className="text-xs text-gray-400">
            {description} {getPeriodDescription()}
          </p>
      </div>
      <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-white/10 backdrop-blur-sm">
        <Icon className="w-6 h-6 text-primaryColor" />
      </div>
    </div>
  </div>
);
};

/**
 * Card de informação adicional
 */
const InfoCard = ({ title, subtitle, icon: Icon, comingSoon = false }) => (
  <div className={`
    relative overflow-hidden rounded-2xl p-6 transition-all duration-300
    border border-gray-700/50 hover:border-gray-600
    bg-gradient-to-br from-dashboardCard/50 to-dashboardBg/30
    ${comingSoon ? 'opacity-75' : ''}
  `}>
    <div className="flex items-center justify-between">
      <div>
        <p className="text-lg font-semibold text-white mb-1">{title}</p>
        <p className="text-sm text-gray-400">{subtitle}</p>
        {comingSoon && (
          <span className="inline-block mt-2 px-2 py-1 text-xs bg-primaryColor/20 text-primaryColor rounded-md">
            Em breve
          </span>
        )}
      </div>
      <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gray-700/30">
        <Icon className="w-6 h-6 text-gray-400" />
      </div>
    </div>
  </div>
);

export function DashboardV2() {
  const [metrics, setMetrics] = useState(/** @type {AggregatedMetrics | null} */(null));
  const [isLoading, setIsLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [selectedPeriod, setSelectedPeriod] = useState('today');
  const [customDates, setCustomDates] = useState(null);

  /**
   * Carrega as métricas agregadas baseado no período selecionado
   */
  const loadMetrics = async () => {
    try {
      setIsLoading(true);
      const aggregatedMetrics = await ipcRenderer.invoke("get-aggregated-metrics-by-period", selectedPeriod, customDates);
      setMetrics(aggregatedMetrics);
      setLastRefresh(new Date());
    } catch (error) {
      console.error("Erro ao carregar métricas:", error);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Atualiza as métricas manualmente
   */
  const refreshMetrics = () => {
    loadMetrics();
  };

  /**
   * Altera o período selecionado
   */
  const handlePeriodChange = (newPeriod, dates = null) => {
    setSelectedPeriod(newPeriod);
    if (newPeriod === 'custom' && dates) {
      setCustomDates(dates);
    } else {
      setCustomDates(null);
    }
  };

  useEffect(() => {
    loadMetrics();
  }, [selectedPeriod, customDates]); // Recarrega quando o período ou datas mudam

  useEffect(() => {
    // Atualiza as métricas a cada 30 segundos apenas se o período for 'today'
    if (selectedPeriod === 'today') {
    const interval = setInterval(loadMetrics, 30000);
    return () => clearInterval(interval);
    }
  }, [selectedPeriod]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-dashboardBg via-dashboardCard/20 to-dashboardBg p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">
              Métricas do Sistema
            </h1>
            <p className="text-gray-300">
              Acompanhe o desempenho em tempo real do seu Zap GPT
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mt-4 sm:mt-0">
            {/* Filtro de Período */}
            <PeriodFilter 
              selectedPeriod={selectedPeriod}
              onPeriodChange={handlePeriodChange}
              isLoading={isLoading}
              customDates={customDates}
            />

            <div className="text-sm text-gray-400">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Última atualização: {lastRefresh.toLocaleTimeString('pt-BR')}
              </div>
            </div>

            <button
              type="button"
              onClick={refreshMetrics}
              disabled={isLoading}
              className="
                flex items-center gap-2 px-4 py-2 rounded-xl
                bg-gradient-to-r from-primaryColor to-dashboardAccent
                text-white font-medium transition-all duration-300
                hover:from-primaryColor/90 hover:to-dashboardAccent/90
                disabled:opacity-50 disabled:cursor-not-allowed
                shadow-lg hover:shadow-glow
              "
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              {isLoading ? 'Carregando...' : 'Atualizar'}
            </button>
          </div>
        </div>

        <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-2xl p-4 mb-8">
          <div className="flex items-start gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-500/20 flex-shrink-0 mt-0.5">
              <Users className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-blue-100">
                Os dados exibidos representam o <strong>total agregado de todas as instâncias</strong> configuradas no sistema.
                Cada instância contribui para os números globais mostrados nos cards.
              </p>
            </div>
          </div>
        </div>

        {/* Cards de Métricas Principais */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <MetricCard
            title="Mensagens Recebidas"
            value={metrics?.totalMessagesReceived}
            icon={MessageSquareText}
            gradient="bg-gradient-to-br from-blue-500/20 to-blue-600/10"
            description="Total de mensagens processadas"
            isLoading={isLoading}
            period={selectedPeriod}
          />

          <MetricCard
            title="Mensagens Enviadas"
            value={metrics?.totalMessagesSent}
            icon={Send}
            gradient="bg-gradient-to-br from-green-500/20 to-green-600/10"
            description="Respostas geradas pela IA"
            isLoading={isLoading}
            period={selectedPeriod}
          />

          <MetricCard
            title="Follow-ups Enviados"
            value={metrics?.totalFollowUpsSent}
            icon={TrendingUp}
            gradient="bg-gradient-to-br from-purple-500/20 to-purple-600/10"
            description="Mensagens de reengajamento"
            isLoading={isLoading}
            period={selectedPeriod}
          />

          <MetricCard
            title="Instâncias Ativas"
            value={metrics?.totalInstances}
            icon={Users}
            gradient="bg-gradient-to-br from-orange-500/20 to-orange-600/10"
            description="Conexões configuradas"
            isLoading={isLoading}
            period={selectedPeriod}
          />
        </div>

        {/* Cards de Informação Adicional */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <InfoCard
            title="Análise de Conversas"
            subtitle="Relatórios detalhados sobre suas interações"
            icon={BarChart3}
            comingSoon={true}
          />

          <InfoCard
            title="Performance da IA"
            subtitle="Tempos de resposta e eficiência"
            icon={Activity}
            comingSoon={true}
          />

          <InfoCard
            title="Métricas Diárias"
            subtitle="Histórico e tendências por período"
            icon={Calendar}
            comingSoon={true}
          />
        </div>

        {/* Status e Informações */}
        <div className="bg-gradient-to-r from-dashboardCard/30 to-dashboardBg/50 rounded-2xl p-6 border border-primaryColor/20">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between">
            <div>
              <h3 className="text-xl font-semibold text-white mb-2">
                Sistema Operacional
              </h3>
              <p className="text-gray-300">
                Todas as métricas são coletadas automaticamente e atualizadas em tempo real
              </p>
            </div>

            <div className="flex items-center gap-2 mt-4 sm:mt-0">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
              <span className="text-green-400 font-medium">Online</span>
            </div>
          </div>
        </div>


        {/* Footer com mais informações */}
        <div className="mt-8 text-center">
          <p className="text-gray-400 text-sm">
            Mais métricas e funcionalidades serão adicionadas em breve.
            <span className="text-primaryColor"> Fique atento às atualizações!</span>
          </p>
        </div>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../lib/queryClient';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  ArrowLeft, 
  MoreVertical, 
  ChevronRight, 
  CheckCircle, 
  X, 
  PlusCircle, 
  MessageSquare, 
  ClipboardList,
  Eye,
  EyeOff,
  Settings,
  Loader2,
  Phone,
  Users,
  FileText,
  Upload,
  Link,
  Edit3
} from 'lucide-react';

// Complete pipeline stages as per documentation
const PIPELINE_STAGES = [
  'Yet to Assign', 
  'Yet to Contact', 
  'Contact Again', 
  'Not Interested', 
  'Planning Later', 
  'Yet to Decide', 
  'Irrelevant Lead', 
  'Registered for Session', 
  'Session Completed', 
  'Docs Submitted', 
  'Shortlisted Univ.', 
  'Application in Progress', 
  'Offer Letter Received',
  'Deposit Paid', 
  'Visa Received', 
  'Flight and Accommodation Booked', 
  'Tuition Fee Paid', 
  'Commission Received'
];

// Dynamic filter data with relationships
const FILTER_DATA = {
  // Country-specific intakes and universities
  countryIntakes: {
    'USA': ['Fall 2024', 'Spring 2025', 'Fall 2025', 'Spring 2026'],
    'Canada': ['Fall 2024', 'Winter 2025', 'Summer 2025', 'Fall 2025'],
    'UK': ['September 2024', 'January 2025', 'September 2025'],
    'Australia': ['February 2025', 'July 2025', 'February 2026'],
    'Singapore': ['August 2024', 'January 2025', 'August 2025'],
    'Germany': ['Winter 2024/25', 'Summer 2025', 'Winter 2025/26'],
    'Ireland': ['September 2024', 'January 2025', 'September 2025'],
    'New Zealand': ['February 2025', 'July 2025', 'February 2026'],
  },
  
  // Popular universities by country and intake
  countryUniversities: {
    'USA': {
      'Fall 2024': ['Harvard University', 'Stanford University', 'MIT', 'UC Berkeley', 'NYU'],
      'Spring 2025': ['Columbia University', 'USC', 'Boston University', 'Northeastern'],
      'Fall 2025': ['Yale University', 'Princeton University', 'University of Chicago', 'UCLA'],
    },
    'Canada': {
      'Fall 2024': ['University of Toronto', 'UBC', 'McGill University', 'Waterloo'],
      'Winter 2025': ['York University', 'Carleton University', 'Ottawa University'],
      'Fall 2025': ['Queen\'s University', 'McMaster University', 'Western University'],
    },
    'UK': {
      'September 2024': ['Oxford University', 'Cambridge University', 'Imperial College', 'LSE'],
      'January 2025': ['King\'s College London', 'UCL', 'Edinburgh University'],
      'September 2025': ['Manchester University', 'Bristol University', 'Warwick'],
    },
    'Australia': {
      'February 2025': ['University of Melbourne', 'ANU', 'University of Sydney', 'UNSW'],
      'July 2025': ['Monash University', 'UQ', 'Adelaide University'],
    },
    'Singapore': {
      'August 2024': ['NUS', 'NTU', 'SMU', 'SUTD'],
      'January 2025': ['SIM', 'PSB Academy', 'Kaplan Singapore'],
    }
  }
};

// Document types that counselors can manage
const DOCUMENT_TYPES = [
  '10th Marksheet',
  '12th Marksheet', 
  'Respected Transcripts',
  'Degree Certificate / Provisional degree',
  'Passport with Address page / Main page',
  'Updated CV - (Europass CV) format',
  'IELTS /TOEFL /PTE Score Cards',
  '3 LOR\'s signed',
  'On-going Certificate',
  'Bonafide certificate',
  'GRE / GMAT score cards (Optional)',
  'Share exam login credentials',
  'Consolidated Marks Memo',
  'CMM Transcript'
];

// Complete dropdown options with dynamic filtering support
const DROPDOWN_OPTIONS = {
  taskType: ['Call', 'Meet Done', 'Shortlisting', 'Application Process', 'Tracking', 'Submit Documents'],
  callType: ['Intro Call', 'Session Follow up call', 'Session Reminder Call', 'Followup Call'],
  callStatus: ['Call Done', 'Call Back', 'Call Rejected', 'Switch Off', 'Not Reachable', 'Not Answered', 'Call Busy', 'Wrong Number'],
  connectStatus: ['Interested', 'Not Interested', 'Planning later', 'Yet to Decide', 'Irrelevant', 'DNP', 'Call back', 'Call Rejected', 'Other Preferred Language', 'Casual Follow-up', 'Session Scheduling'],
  country: ['USA', 'Canada', 'UK', 'Australia', 'Singapore', 'Germany', 'Ireland', 'New Zealand'],
  intake: ['Fall 2024', 'Spring 2025', 'Fall 2025', 'Spring 2026', 'Fall 2026'],
  prevConsultancy: ['Application Started', 'Offer Received', 'In Loan Process', "No, haven't started", 'Session Scheduled'],
  sessionStatus: ['Confirmed, Will attend', 'Rescheduled', 'Cancelled', 'Completed'],
  isRescheduled: ['Yes', 'No'],
  notInterestedReason: ['Already started the process', 'Financial issue', 'Looking for placement/Job', 'Planning higher studies in India', 'Low financial status', 'Family unwilling to invest', 'Debt burden already exists', 'Not eligible for loan', 'No property or asset for collateral', 'Parents oppose taking loans', 'Fear of loan repayment pressure'],
  planningLaterReason: ['Financial readiness', 'Exam preparation', 'Personal commitments'],
  yetToDecideReason: ['Want to discuss with family/friends/relatives', 'Other'],
  preferredLanguage: ['Tamil', 'Telugu', 'Malayalam', 'Gujarati', 'Hindi', 'Kannada', 'Marathi', 'Odia', 'Punjabi', 'Sanskrit', 'Urdu'],
  shortlistingInitiated: ['Requested In KC', 'Done by own'],
  shortlistingStatus: ['New Shortlisting', 'Add-on Shortlisting'],
  shortlistingFinalStatus: ['Sent to students', 'Yet to send'],
  applicationProcess: ['New Application Initiated at KC', 'Add-on Application Initiated at KC'],
  trackingStatus: ['Credentials logging', 'Application Status', 'Offer Letter Status', 'VISA Tracking'],
  applicationStatus: ['Application submitted to KC', 'Application submitted to university', 'Docs Pending', 'In Progress', 'Awaiting decision', 'Accepted', 'Rejected'],
  offerLetterStatus: ['Conditional', 'Unconditional'],
  visaStatus: ['Applied', 'In Process', 'Approved', 'Rejected'],
  depositStatus: ['Paid', 'Pending', 'Not Required'],
  tuitionStatus: ['Paid', 'Pending', 'Partial Payment'],
  commissionStatus: ['Received', 'Pending', 'Processing']
};

// Dynamic filtering utilities
const getFilteredIntakes = (country: string): string[] => {
  return (FILTER_DATA.countryIntakes as any)[country] || DROPDOWN_OPTIONS.intake;
};

const getFilteredUniversities = (country: string, intake: string): string[] => {
  const countryData = (FILTER_DATA.countryUniversities as any)[country];
  if (!countryData) return [];
  return countryData[intake] || [];
};

// Check if task type requires specific fields
const requiresUniversityDetails = (taskType: string, trackingStatus: string) => {
  return taskType === 'Tracking' && trackingStatus === 'Credentials logging';
};

const requiresFollowUpDate = (connectStatus: string, sessionStatus: string) => {
  const followUpStatuses = ['Call back', 'Session Scheduling', 'Casual Follow-up'];
  return followUpStatuses.includes(connectStatus) || sessionStatus === 'Rescheduled';
};

// Stage progression logic
const getNextStageFromTask = (taskData: any, currentStage: string) => {
  const { taskType, connectStatus, callStatus, shortlistingFinalStatus, applicationProcess, trackingStatus, offerLetterStatus, visaStatus, sessionStatus } = taskData;

  if (taskType === 'Call') {
    // Handle new call status logic
    if (callStatus) {
      switch (callStatus) {
        case 'Call Done':
          // Only Call Done shows connect status, other logic remains the same
          switch (connectStatus) {
            case 'Interested': 
              return null; // Stay in current stage for further processing
            case 'Not Interested': 
              return 'Not Interested';
            case 'Planning later': 
              return 'Planning Later';
            case 'Yet to Decide': 
              return 'Yet to Decide';
            case 'Irrelevant': 
              return 'Irrelevant Lead';
            case 'Session Scheduling':
              return 'Registered for Session';
            default:
              return null;
          }
        case 'Wrong Number':
          return 'Irrelevant Lead';
        case 'Call Back':
        case 'Call Rejected':
        case 'Switch Off':
        case 'Not Reachable':
        case 'Not Answered':
        case 'Call Busy':
          return 'Contact Again';
        default:
          return null;
      }
    }
  }

  if (taskType === 'Meet Done') {
    switch (connectStatus) {
      case 'Interested': 
        return 'Session Completed';
      case 'Not Interested': 
        return 'Not Interested';
      case 'Planning later': 
        return 'Planning Later';
      case 'Yet to Decide': 
        return 'Yet to Decide';
      case 'Irrelevant': 
        return 'Irrelevant Lead';
      case 'Session Scheduling': 
        return 'Registered for Session';
      default: 
        return null;
    }
  }
  
  if (taskType === 'Shortlisting' && shortlistingFinalStatus === 'Sent to students') {
    return 'Shortlisted Univ.';
  }

  if (taskType === 'Application Process' && applicationProcess) {
    return 'Application in Progress';
  }

  if (taskType === 'Tracking') {
    if (trackingStatus === 'Offer Letter Status' && offerLetterStatus) {
      return 'Offer Letter Received';
    }
    if (trackingStatus === 'VISA Tracking' && visaStatus === 'Approved') {
      return 'Visa Received';
    }
  }

  if (taskType === 'Submit Documents') {
    return 'Docs Submitted';
  }

  return null; // Return null if no stage change is triggered
};

// Enhanced Task data interface
interface TaskData {
  id?: number;
  taskType?: string;
  callType?: string;
  connectStatus?: string;
  country?: string;
  intake?: string;
  prevConsultancy?: string;
  sessionStatus?: string;
  sessionDate?: string;
  isRescheduled?: string;
  shortlistingInitiated?: string;
  shortlistingStatus?: string;
  shortlistingFinalStatus?: string;
  applicationProcess?: string;
  applicationCount?: string;
  trackingStatus?: string;
  applicationStatus?: string;
  offerLetterStatus?: string;
  visaStatus?: string;
  depositStatus?: string;
  tuitionStatus?: string;
  commissionStatus?: string;
  remarks?: string;
  universityName?: string;
  universityUrl?: string;
  username?: string;
  password?: string;
  reasonNotInterested?: string;
  preferredLanguage?: string;
  userId?: number;
  userName?: string;
  createdAt?: string;
}

interface RemarkData {
  id?: number;
  content: string;
  userId: number;
  userName?: string;
  createdAt: string;
}

interface StageHistoryData {
  id?: number;
  fromStage?: string;
  toStage: string;
  userId: number;
  userName?: string;
  reason?: string;
  createdAt: string;
}

interface UniversityAppData {
  id?: number;
  universityName: string;
  universityUrl?: string;
  username?: string;
  password?: string;
  status?: string;
  createdAt?: string;
}

// Task form schema with conditional validation
const taskSchema = z.object({
  taskType: z.string().min(1, 'Task type is required'),
  callType: z.string().optional(),
  callStatus: z.string().optional(),
  connectStatus: z.string().optional(),
  country: z.string().optional(),
  intake: z.string().optional(),
  prevConsultancy: z.string().optional(),
  sessionStatus: z.string().optional(),
  sessionDate: z.string().optional(),
  isRescheduled: z.string().optional(),
  shortlistingInitiated: z.string().optional(),
  shortlistingStatus: z.string().optional(),
  shortlistingFinalStatus: z.string().optional(),
  applicationProcess: z.string().optional(),
  applicationCount: z.string().optional(),
  trackingStatus: z.string().optional(),
  applicationStatus: z.string().optional(),
  offerLetterStatus: z.string().optional(),
  visaStatus: z.string().optional(),
  depositStatus: z.string().optional(),
  tuitionStatus: z.string().optional(),
  commissionStatus: z.string().optional(),
  remarks: z.string().min(1, 'Remarks are required for all tasks'),
  universityName: z.string().optional(),
  universityUrl: z.string().optional(),
  username: z.string().optional(),
  password: z.string().optional(),
  reasonNotInterested: z.string().optional(),
  preferredLanguage: z.string().optional(),
}).refine((data) => {
  // Call Status is required when task type is Call
  if (data.taskType === 'Call' && (!data.callStatus || data.callStatus.trim() === '')) {
    return false;
  }
  return true;
}, {
  message: 'Call status is required for call tasks',
  path: ['callStatus'],
}).refine((data) => {
  // Connect Status is required when call status is "Call Done"
  if (data.taskType === 'Call' && data.callStatus === 'Call Done' && (!data.connectStatus || data.connectStatus.trim() === '')) {
    return false;
  }
  return true;
}, {
  message: 'Connect status is required when call is completed',
  path: ['connectStatus'],
}).refine((data) => {
  // Reason is required when connect status is "Not Interested"
  if (data.connectStatus === 'Not Interested' && (!data.reasonNotInterested || data.reasonNotInterested.trim() === '')) {
    return false;
  }
  return true;
}, {
  message: 'Reason is required when lead is not interested',
  path: ['reasonNotInterested'],
}).refine((data) => {
  // When follow-up is required, session date must be provided
  const requiresFollowUp = data.connectStatus === 'Call back' || 
                          data.connectStatus === 'Session Scheduling' || 
                          data.connectStatus === 'Casual Follow-up' ||
                          data.sessionStatus === 'Rescheduled';
  
  if (requiresFollowUp && (!data.sessionDate || data.sessionDate.trim() === '')) {
    return false;
  }
  return true;
}, {
  message: 'Follow-up date is required when scheduling callbacks, sessions, or follow-ups',
  path: ['sessionDate'],
});

type TaskFormData = z.infer<typeof taskSchema>;

// Reusable dynamic filtering hook
const useDynamicFilters = (form: any) => {
  const watchedValues = form.watch();
  
  // Available options based on current selections
  const availableIntakes = getFilteredIntakes(watchedValues.country || '');
  const availableUniversities = getFilteredUniversities(watchedValues.country || '', watchedValues.intake || '');
  
  // Conditional field requirements
  const needsFollowUpDate = requiresFollowUpDate(watchedValues.connectStatus, watchedValues.sessionStatus);
  const needsUniversityDetails = requiresUniversityDetails(watchedValues.taskType, watchedValues.trackingStatus);
  const showSessionFields = (watchedValues.taskType === 'Call' || watchedValues.taskType === 'Meet Done') && 
                           watchedValues.connectStatus === 'Session Scheduling';
  
  // Task type specific field visibility
  const showCallFields = watchedValues.taskType === 'Call' || watchedValues.taskType === 'Meet Done';
  const showShortlistingFields = watchedValues.taskType === 'Shortlisting';
  const showApplicationFields = watchedValues.taskType === 'Application Process';
  const showTrackingFields = watchedValues.taskType === 'Tracking';
  
  return {
    watchedValues,
    availableIntakes,
    availableUniversities,
    needsFollowUpDate,
    needsUniversityDetails,
    showSessionFields,
    showCallFields,
    showShortlistingFields,
    showApplicationFields,
    showTrackingFields
  };
};

// Task Composer Component
const TaskComposer = ({ onTaskComplete, currentStage }: { onTaskComplete: (taskData: TaskData, nextStage: string | null) => void; currentStage: string }) => {
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [step, setStep] = useState(1);

  const form = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      taskType: '',
      callType: '',
      connectStatus: '',
      country: '',
      intake: '',
      prevConsultancy: '',
      sessionStatus: '',
      sessionDate: '',
      isRescheduled: '',
      shortlistingInitiated: '',
      shortlistingStatus: '',
      shortlistingFinalStatus: '',
      applicationProcess: '',
      applicationCount: '',
      trackingStatus: '',
      applicationStatus: '',
      offerLetterStatus: '',
      visaStatus: '',
      depositStatus: '',
      tuitionStatus: '',
      commissionStatus: '',
      remarks: '',
      universityName: '',
      universityUrl: '',
      username: '',
      password: '',
      reasonNotInterested: '',
      preferredLanguage: '',
    },
  });

  const { 
    watchedValues, 
    availableIntakes,
    availableUniversities,
    needsFollowUpDate,
    needsUniversityDetails,
    showSessionFields,
    showCallFields,
    showShortlistingFields,
    showApplicationFields,
    showTrackingFields
  } = useDynamicFilters(form);

  const resetForm = () => {
    form.reset();
    setStep(1);
  };

  const handleOpenModal = () => {
    resetForm();
    setIsTaskModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsTaskModalOpen(false);
    resetForm();
  };

  const handleSubmit = (data: TaskFormData) => {
    const nextStage = getNextStageFromTask(data, currentStage);
    onTaskComplete(data, nextStage);
    handleCloseModal();
  };

  const handleNext = () => {
    setStep(step + 1);
  };

  const handleBack = () => {
    setStep(step - 1);
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="taskType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Task Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-task-type">
                        <SelectValue placeholder="Select task type..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {DROPDOWN_OPTIONS.taskType.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            {watchedValues.taskType && (
              <div className="flex justify-end space-x-2">
                <Button type="button" onClick={handleNext} data-testid="button-next-step">
                  Next <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            {/* Call Status field - appears immediately after selecting Call task type */}
            {watchedValues.taskType === 'Call' && (
              <FormField
                control={form.control}
                name="callStatus"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Call Status *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-call-status">
                          <SelectValue placeholder="Select call status..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {DROPDOWN_OPTIONS.callStatus.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Call Type specific fields */}
            {showCallFields && watchedValues.taskType === 'Call' && (
              <FormField
                control={form.control}
                name="callType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Call Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-call-type">
                          <SelectValue placeholder="Select call type..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {DROPDOWN_OPTIONS.callType.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Shortlisting specific fields */}
            {showShortlistingFields && (
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="shortlistingInitiated"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Shortlisting Initiated</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {DROPDOWN_OPTIONS.shortlistingInitiated.map((option) => (
                            <SelectItem key={option} value={option}>
                              {option}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="shortlistingStatus"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Shortlisting Status</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {DROPDOWN_OPTIONS.shortlistingStatus.map((option) => (
                            <SelectItem key={option} value={option}>
                              {option}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Country</FormLabel>
                      <Select onValueChange={(value) => {
                        field.onChange(value);
                        // Reset dependent fields when country changes
                        form.setValue('intake', '');
                        form.setValue('universityName', '');
                      }} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-country">
                            <SelectValue placeholder="Select country..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {DROPDOWN_OPTIONS.country.map((option) => (
                            <SelectItem key={option} value={option}>
                              {option}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="intake"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Intake</FormLabel>
                      <Select 
                        onValueChange={(value) => {
                          field.onChange(value);
                          // Reset university when intake changes
                          form.setValue('universityName', '');
                        }} 
                        defaultValue={field.value}
                        disabled={!watchedValues.country}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-intake">
                            <SelectValue placeholder={
                              !watchedValues.country 
                                ? "Select country first..." 
                                : "Select intake..."
                            } />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {availableIntakes.map((option: string) => (
                            <SelectItem key={option} value={option}>
                              {option}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="shortlistingFinalStatus"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Final Status</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {DROPDOWN_OPTIONS.shortlistingFinalStatus.map((option) => (
                            <SelectItem key={option} value={option}>
                              {option}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* Application Process specific fields */}
            {showApplicationFields && (
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="applicationProcess"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Application Process</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {DROPDOWN_OPTIONS.applicationProcess.map((option) => (
                            <SelectItem key={option} value={option}>
                              {option}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="applicationCount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>How many applications submitted to KC?</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="Enter count" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* Tracking specific fields */}
            {showTrackingFields && (
              <FormField
                control={form.control}
                name="trackingStatus"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tracking Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {DROPDOWN_OPTIONS.trackingStatus.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="flex justify-between space-x-2">
              <Button type="button" variant="outline" onClick={handleBack} data-testid="button-back-step">
                Back
              </Button>
              <Button type="button" onClick={handleNext} data-testid="button-next-step">
                Next <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            {/* Connect Status for Call and Meet Done - only show for Call Done or Meet Done tasks */}
            {((showCallFields && watchedValues.taskType === 'Meet Done') || 
             (watchedValues.taskType === 'Call' && watchedValues.callStatus === 'Call Done')) && (
              <FormField
                control={form.control}
                name="connectStatus"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Call/Meet Connect Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-connect-status">
                          <SelectValue placeholder="Select status..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {DROPDOWN_OPTIONS.connectStatus.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Follow-up Date for scenarios requiring scheduling */}
            {needsFollowUpDate && (
              <FormField
                control={form.control}
                name="sessionDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Follow-up Date & Time *</FormLabel>
                    <FormControl>
                      <Input 
                        type="datetime-local" 
                        {...field} 
                        data-testid="input-follow-up-date"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Session Status when applicable */}
            {showSessionFields && (
              <FormField
                control={form.control}
                name="sessionStatus"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Session Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-session-status">
                          <SelectValue placeholder="Select status..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {DROPDOWN_OPTIONS.sessionStatus.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Reschedule confirmation */}
            {watchedValues.sessionStatus === 'Rescheduled' && (
              <FormField
                control={form.control}
                name="isRescheduled"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm Reschedule</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-reschedule-confirm">
                          <SelectValue placeholder="Select..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {DROPDOWN_OPTIONS.isRescheduled.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Tracking details */}
            {needsUniversityDetails && (
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="universityName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>University Name</FormLabel>
                      {watchedValues.country && watchedValues.intake && 
                       getFilteredUniversities(watchedValues.country, watchedValues.intake).length > 0 ? (
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-university">
                              <SelectValue placeholder="Select university..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {getFilteredUniversities(watchedValues.country, watchedValues.intake).map((option: string) => (
                              <SelectItem key={option} value={option}>
                                {option}
                              </SelectItem>
                            ))}
                            <SelectItem value="custom">
                              Other (Enter Custom)
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <FormControl>
                          <Input 
                            placeholder={
                              !watchedValues.country 
                                ? "Select country and intake first..." 
                                : "Enter university name"
                            } 
                            {...field} 
                            data-testid="input-university-custom"
                            disabled={!watchedValues.country || !watchedValues.intake}
                          />
                        </FormControl>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="universityUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>University URL</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter URL" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter username" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Enter password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* Application Status tracking */}
            {watchedValues.taskType === 'Tracking' && watchedValues.trackingStatus === 'Application Status' && (
              <FormField
                control={form.control}
                name="applicationStatus"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Application Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {DROPDOWN_OPTIONS.applicationStatus.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Offer Letter Status tracking */}
            {watchedValues.taskType === 'Tracking' && watchedValues.trackingStatus === 'Offer Letter Status' && (
              <FormField
                control={form.control}
                name="offerLetterStatus"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Offer Letter Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {DROPDOWN_OPTIONS.offerLetterStatus.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Visa tracking */}
            {watchedValues.taskType === 'Tracking' && watchedValues.trackingStatus === 'VISA Tracking' && (
              <FormField
                control={form.control}
                name="visaStatus"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Visa Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {DROPDOWN_OPTIONS.visaStatus.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="flex justify-between space-x-2">
              <Button type="button" variant="outline" onClick={handleBack} data-testid="button-back-step">
                Back
              </Button>
              <Button type="button" onClick={handleNext} data-testid="button-next-step">
                Next <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            {/* Additional details based on connect status */}
            {watchedValues.connectStatus === 'Not Interested' && (
              <FormField
                control={form.control}
                name="reasonNotInterested"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reason for Not Interested *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select reason..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {DROPDOWN_OPTIONS.notInterestedReason.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {watchedValues.connectStatus === 'Other Preferred Language' && (
              <FormField
                control={form.control}
                name="preferredLanguage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preferred Language</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select language..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {DROPDOWN_OPTIONS.preferredLanguage.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Remarks field for all task types */}
            <FormField
              control={form.control}
              name="remarks"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Remarks *</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Remarks are required - add details about this task..." {...field} data-testid="textarea-remarks" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-between space-x-2">
              <Button type="button" variant="outline" onClick={handleBack} data-testid="button-back-step">
                Back
              </Button>
              <Button type="submit" className="bg-green-600 hover:bg-green-700 text-white" data-testid="button-complete-task">
                <CheckCircle className="mr-2 h-4 w-4" />
                Complete Task
              </Button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <>
      <Button onClick={handleOpenModal} className="w-full" data-testid="button-add-task">
        <PlusCircle className="mr-2 h-4 w-4" />
        Add Task
      </Button>

      <Dialog open={isTaskModalOpen} onOpenChange={setIsTaskModalOpen}>
        <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Task</DialogTitle>
            <DialogDescription>
              Step {step} of 4: {step === 1 ? 'Select Task Type' : step === 2 ? 'Task Details' : step === 3 ? 'Additional Information' : 'Final Details'}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              {renderStep()}
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
};

// Helper function to check if user is admin
const isAdmin = () => {
  const user = localStorage.getItem('user');
  return user ? JSON.parse(user).role === 'admin' : false;
};

// Edit Lead Form Schema
const editLeadSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().min(1, 'Phone is required'),
  country: z.string().optional(),
  course: z.string().optional(),
  intake: z.string().optional(),
  source: z.string().optional(),
  passportStatus: z.string().optional(),
});

type EditLeadFormData = z.infer<typeof editLeadSchema>;

// Edit Lead Modal Component
const EditLeadModal = ({ lead, onSuccess }: { lead: any; onSuccess: () => void }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const form = useForm<EditLeadFormData>({
    resolver: zodResolver(editLeadSchema),
    defaultValues: {
      name: lead.name || '',
      email: lead.email || '',
      phone: lead.phone || '',
      country: lead.country || '',
      course: lead.course || '',
      intake: lead.intake || '',
      source: lead.source || '',
      passportStatus: lead.passportStatus || '',
    }
  });

  const editLeadMutation = useMutation({
    mutationFn: async (data: EditLeadFormData) => {
      return await apiRequest(`/api/leads/${lead.id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      toast({ title: "Lead updated successfully" });
      queryClient.invalidateQueries({ queryKey: [`/api/leads/${lead.id}`] });
      setIsOpen(false);
      onSuccess();
    },
    onError: (error: any) => {
      toast({ title: "Error updating lead", description: error.message, variant: "destructive" });
    },
  });

  const onSubmit = (data: EditLeadFormData) => {
    editLeadMutation.mutate(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" data-testid="button-edit-lead">
          <Edit3 className="h-4 w-4 mr-1" />
          Edit Lead
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Lead Information</DialogTitle>
          <DialogDescription>
            Update the lead's information. All fields can be modified.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Full name" data-testid="input-edit-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input {...field} type="email" placeholder="Email address" data-testid="input-edit-email" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Phone number" data-testid="input-edit-phone" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="country"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Country</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Country" data-testid="input-edit-country" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="course"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Course</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Course of interest" data-testid="input-edit-course" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="intake"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Intake</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Intake period" data-testid="input-edit-intake" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="source"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Source</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Lead source" data-testid="input-edit-source" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="passportStatus"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Passport Status</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Passport status" data-testid="input-edit-passport" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={editLeadMutation.isPending} data-testid="button-save-lead">
                {editLeadMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

// Lead Data Card Component
const LeadDataCard = ({ lead, lastTask }: { lead: any; lastTask: TaskData | null }) => {
  const [refreshKey, setRefreshKey] = useState(0);
  
  if (!lead) return <div>Loading...</div>;

  const handleEditSuccess = () => {
    setRefreshKey(prev => prev + 1);
  };

  return (
    <Card key={refreshKey}>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Lead Data</CardTitle>
          {isAdmin() && (
            <EditLeadModal lead={lead} onSuccess={handleEditSuccess} />
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h4 className="font-semibold mb-2 pb-1 border-b">Personal Data</h4>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <p><span className="font-medium">Lead ID:</span> LD-{lead.id}</p>
            {lead.uid && <p><span className="font-medium">External UID:</span> {lead.uid}</p>}
            <p><span className="font-medium">Source:</span> {lead.source || 'CSV Import'}</p>
            <p><span className="font-medium">Name:</span> {lead.name}</p>
            <p><span className="font-medium">Created:</span> {new Date(lead.createdAt).toLocaleDateString()}</p>
            <p><span className="font-medium">Email:</span> {lead.email || 'Not provided'}</p>
            <p><span className="font-medium">Phone:</span> {lead.phone}</p>
            <p><span className="font-medium">Country:</span> {lead.country || '-'}</p>
            <p><span className="font-medium">Course:</span> {lead.course || '-'}</p>
          </div>
        </div>
        {lastTask && (
          <div>
            <h4 className="font-semibold mb-2 mt-4 pb-1 border-b">Last Task Details</h4>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <p><span className="font-medium">Task Type:</span> {lastTask.taskType}</p>
              {lastTask.callType && <p><span className="font-medium">Call Type:</span> {lastTask.callType}</p>}
              {lastTask.connectStatus && <p><span className="font-medium">Connect Status:</span> {lastTask.connectStatus}</p>}
              {lastTask.reasonNotInterested && <p><span className="font-medium">Not Interested Reason:</span> {lastTask.reasonNotInterested}</p>}
              {lastTask.country && <p><span className="font-medium">Country:</span> {lastTask.country}</p>}
              {lastTask.intake && <p><span className="font-medium">Intake:</span> {lastTask.intake}</p>}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Documents List Component
const DocumentsList = ({ leadId }: { leadId: string }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newDocumentUrl, setNewDocumentUrl] = useState('');
  const [selectedDocumentType, setSelectedDocumentType] = useState('');
  const [documentRemarks, setDocumentRemarks] = useState('');

  // Fetch documents for this lead
  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['/api/documents', leadId],
    queryFn: () => fetch(`/api/documents/${leadId}`).then(res => res.json()),
  });

  // Add document mutation
  const addDocumentMutation = useMutation({
    mutationFn: async (documentData: any) => {
      return apiRequest(`/api/documents`, {
        method: 'POST',
        body: JSON.stringify(documentData),
        headers: { 'Content-Type': 'application/json' }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/documents', leadId] });
      setNewDocumentUrl('');
      setSelectedDocumentType('');
      setDocumentRemarks('');
      toast({
        title: "Success",
        description: "Document link added successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add document link",
        variant: "destructive",
      });
    },
  });

  // Update document mutation
  const updateDocumentMutation = useMutation({
    mutationFn: async ({ id, documentUrl, remarks }: { id: number; documentUrl: string; remarks?: string }) => {
      return apiRequest(`/api/documents/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ documentUrl, remarks }),
        headers: { 'Content-Type': 'application/json' }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/documents', leadId] });
      toast({
        title: "Success",
        description: "Document updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update document",
        variant: "destructive",
      });
    },
  });

  const handleAddDocument = () => {
    if (!selectedDocumentType || !newDocumentUrl.trim()) {
      toast({
        title: "Error",
        description: "Please select document type and enter URL",
        variant: "destructive",
      });
      return;
    }

    addDocumentMutation.mutate({
      leadId: parseInt(leadId),
      documentType: selectedDocumentType,
      documentUrl: newDocumentUrl.trim(),
      remarks: documentRemarks.trim() || null,
    });
  };

  const handleUpdateDocument = (doc: any, newUrl: string, newRemarks: string) => {
    updateDocumentMutation.mutate({
      id: doc.id,
      documentUrl: newUrl,
      remarks: newRemarks,
    });
  };

  // Group documents by type for display
  const documentsByType = documents.reduce((acc: any, doc: any) => {
    if (!acc[doc.documentType]) {
      acc[doc.documentType] = [];
    }
    acc[doc.documentType].push(doc);
    return acc;
  }, {});

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="ml-2">Loading documents...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Add New Document */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Add Document Link</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="documentType">Document Type</Label>
              <Select 
                value={selectedDocumentType} 
                onValueChange={setSelectedDocumentType}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select document type" />
                </SelectTrigger>
                <SelectContent>
                  {DOCUMENT_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="documentUrl">Document URL/Link</Label>
              <Input
                id="documentUrl"
                value={newDocumentUrl}
                onChange={(e) => setNewDocumentUrl(e.target.value)}
                placeholder="https://drive.google.com/..."
                data-testid="input-document-url"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="remarks">Remarks (Optional)</Label>
            <Textarea
              id="remarks"
              value={documentRemarks}
              onChange={(e) => setDocumentRemarks(e.target.value)}
              placeholder="Additional notes about this document..."
              rows={2}
              data-testid="textarea-document-remarks"
            />
          </div>
          <Button 
            onClick={handleAddDocument}
            disabled={addDocumentMutation.isPending}
            data-testid="button-add-document"
          >
            {addDocumentMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            <Link className="h-4 w-4 mr-2" />
            Add Document Link
          </Button>
        </CardContent>
      </Card>

      {/* Documents Grid */}
      <div className="grid gap-4">
        {DOCUMENT_TYPES.map((documentType) => (
          <DocumentTypeCard 
            key={documentType}
            documentType={documentType}
            documents={documentsByType[documentType] || []}
            onUpdate={handleUpdateDocument}
            isUpdating={updateDocumentMutation.isPending}
          />
        ))}
      </div>
    </div>
  );
};

// Document Type Card Component
const DocumentTypeCard = ({ 
  documentType, 
  documents, 
  onUpdate, 
  isUpdating 
}: { 
  documentType: string; 
  documents: any[]; 
  onUpdate: (doc: any, url: string, remarks: string) => void;
  isUpdating: boolean;
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editUrl, setEditUrl] = useState('');
  const [editRemarks, setEditRemarks] = useState('');
  const [editingDoc, setEditingDoc] = useState<any>(null);

  const handleEdit = (doc: any) => {
    setEditingDoc(doc);
    setEditUrl(doc.documentUrl || '');
    setEditRemarks(doc.remarks || '');
    setIsEditing(true);
  };

  const handleSave = () => {
    if (editingDoc && editUrl.trim()) {
      onUpdate(editingDoc, editUrl.trim(), editRemarks.trim());
      setIsEditing(false);
      setEditingDoc(null);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditingDoc(null);
    setEditUrl('');
    setEditRemarks('');
  };

  const hasDocument = documents.length > 0;

  return (
    <Card className={`border ${hasDocument ? 'border-green-200 bg-green-50' : 'border-gray-200'}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center">
            <FileText className="h-4 w-4 mr-2" />
            {documentType}
          </CardTitle>
          <Badge variant={hasDocument ? 'default' : 'secondary'}>
            {hasDocument ? 'Submitted' : 'Pending'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {documents.length === 0 ? (
          <p className="text-sm text-gray-500">No document submitted yet</p>
        ) : (
          <div className="space-y-3">
            {documents.map((doc, index) => (
              <div key={doc.id} className="bg-white p-3 rounded-lg border">
                {isEditing && editingDoc?.id === doc.id ? (
                  <div className="space-y-3">
                    <div>
                      <Label className="text-xs">Document URL</Label>
                      <Input
                        value={editUrl}
                        onChange={(e) => setEditUrl(e.target.value)}
                        placeholder="https://drive.google.com/..."
                        className="text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Remarks</Label>
                      <Textarea
                        value={editRemarks}
                        onChange={(e) => setEditRemarks(e.target.value)}
                        placeholder="Additional notes..."
                        rows={2}
                        className="text-sm"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        onClick={handleSave}
                        disabled={isUpdating}
                      >
                        {isUpdating && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                        Save
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={handleCancel}
                        disabled={isUpdating}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <a 
                        href={doc.documentUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium break-all"
                        data-testid={`link-document-${doc.id}`}
                      >
                        {doc.documentUrl}
                      </a>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleEdit(doc)}
                        data-testid={`button-edit-document-${doc.id}`}
                      >
                        Edit
                      </Button>
                    </div>
                    {doc.remarks && (
                      <p className="text-xs text-gray-600 mb-2">{doc.remarks}</p>
                    )}
                    <div className="text-xs text-gray-500">
                      Added: {new Date(doc.createdAt).toLocaleDateString()}
                      {doc.updatedAt !== doc.createdAt && (
                        <span> • Updated: {new Date(doc.updatedAt).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const LeadWorkspace = () => {
  const { leadId } = useParams<{ leadId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // State
  const [isStageModalOpen, setIsStageModalOpen] = useState(false);
  const [isAdminStageModalOpen, setIsAdminStageModalOpen] = useState(false);
  const [visiblePasswords, setVisiblePasswords] = useState<Record<number, boolean>>({});

  // Get current user
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = currentUser.role === 'admin';
  const currentUserName = currentUser.name || 'Unknown User';

  // Fetch lead data
  const { data: lead, isLoading: leadLoading } = useQuery({
    queryKey: [`/api/leads/${leadId}`],
    queryFn: () => apiRequest(`/api/leads/${leadId}`),
    enabled: !!leadId
  });

  // Fetch tasks
  const { data: tasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: [`/api/leads/${leadId}/tasks`],
    queryFn: () => apiRequest(`/api/leads/${leadId}/tasks`),
    enabled: !!leadId
  });

  // Fetch stage history
  const { data: history = [], isLoading: historyLoading } = useQuery({
    queryKey: [`/api/leads/${leadId}/history`],
    queryFn: () => apiRequest(`/api/leads/${leadId}/history`),
    enabled: !!leadId
  });

  // Fetch remarks
  const { data: remarks = [], isLoading: remarksLoading } = useQuery({
    queryKey: [`/api/leads/${leadId}/remarks`],
    queryFn: () => apiRequest(`/api/leads/${leadId}/remarks`),
    enabled: !!leadId
  });

  // Fetch university applications
  const { data: universityApps = [], isLoading: appsLoading } = useQuery({
    queryKey: [`/api/leads/${leadId}/universities`],
    queryFn: () => apiRequest(`/api/leads/${leadId}/universities`),
    enabled: !!leadId
  });

  // Mutations
  const createTaskMutation = useMutation({
    mutationFn: (taskData: TaskData) =>
      apiRequest(`/api/leads/${leadId}/tasks`, {
        method: 'POST',
        body: JSON.stringify({ ...taskData, userId: currentUser.id })
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/leads/${leadId}/tasks`] });
      queryClient.invalidateQueries({ queryKey: [`/api/leads/${leadId}`] });
      toast({ title: 'Success', description: 'Task created successfully' });
    }
  });

  const updateStageMutation = useMutation({
    mutationFn: ({ stage, reason }: { stage: string; reason?: string }) =>
      apiRequest(`/api/leads/${leadId}/stage`, {
        method: 'PUT',
        body: JSON.stringify({ stage, userId: currentUser.id, reason })
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/leads'] });
      queryClient.invalidateQueries({ queryKey: [`/api/leads/${leadId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/leads/${leadId}/history`] });
      toast({ title: 'Success', description: 'Stage updated successfully' });
      setIsStageModalOpen(false);
      setIsAdminStageModalOpen(false);
    }
  });

  const createRemarkMutation = useMutation({
    mutationFn: (content: string) =>
      apiRequest(`/api/leads/${leadId}/remarks`, {
        method: 'POST',
        body: JSON.stringify({ content, userId: currentUser.id })
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/leads/${leadId}/remarks`] });
      toast({ title: 'Success', description: 'Remark added successfully' });
    }
  });

  const createUniversityAppMutation = useMutation({
    mutationFn: (appData: UniversityAppData) =>
      apiRequest(`/api/leads/${leadId}/universities`, {
        method: 'POST',
        body: JSON.stringify(appData)
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/leads/${leadId}/universities`] });
      toast({ title: 'Success', description: 'University application added successfully' });
    }
  });

  // Handle task completion with stage progression
  const handleTaskComplete = (taskData: TaskData, nextStage: string | null) => {
    createTaskMutation.mutate(taskData, {
      onSuccess: () => {
        // If task triggers a stage change, update the stage
        if (nextStage && nextStage !== lead?.currentStage) {
          updateStageMutation.mutate({ 
            stage: nextStage, 
            reason: `Automatic stage change from ${taskData.taskType} task` 
          });
          toast({
            title: "Task Completed & Stage Updated!",
            description: `Lead moved from "${lead?.currentStage}" to "${nextStage}"`,
          });
        }
        
        // Add university application if tracking credentials
        if (taskData.taskType === 'Tracking' && taskData.trackingStatus === 'Credentials logging' && taskData.universityName) {
          createUniversityAppMutation.mutate({
            universityName: taskData.universityName,
            universityUrl: taskData.universityUrl,
            username: taskData.username,
            password: taskData.password,
            status: 'In Progress'
          });
        }
        
        // Add remark if provided
        if (taskData.remarks) {
          createRemarkMutation.mutate(taskData.remarks);
        }
      }
    });
  };

  if (leadLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <div>Loading lead data...</div>
        </div>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg font-medium text-gray-900 mb-2">Lead not found</div>
          <Button onClick={() => navigate('/admin/leads')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Leads
          </Button>
        </div>
      </div>
    );
  }

  const currentStageIndex = PIPELINE_STAGES.indexOf(lead.currentStage);
  const currentStage = lead.currentStage;
  const nextManualStage = PIPELINE_STAGES[currentStageIndex + 1];
  const isFinalStage = currentStageIndex >= PIPELINE_STAGES.length - 1;
  const progressPercentage = ((currentStageIndex + 1) / PIPELINE_STAGES.length) * 100;

  const togglePasswordVisibility = (index: number) => {
    setVisiblePasswords(prev => ({ ...prev, [index]: !prev[index] }));
  };

  const lastTask = tasks.length > 0 ? tasks[tasks.length - 1] : null;

  // Get counselor and manager names
  const counselorName = lead.counselorName || 'Unassigned';
  const managerName = 'Anupriya'; // As requested by user

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Button 
                variant="ghost" 
                onClick={() => navigate('/admin/leads')}
                className="mr-4"
                data-testid="button-back-to-leads"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Leads
              </Button>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">{lead.name}</h1>
                <p className="text-sm text-gray-500">Lead ID: LD-{lead.id}</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right text-sm">
                <p className="font-medium">Counselor: {counselorName}</p>
                <p className="text-gray-500">Manager: {managerName}</p>
              </div>
              <Button variant="ghost" size="sm">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Progress Section */}
        <div className="mb-8">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Current Stage: {currentStage}</CardTitle>
                  <CardDescription>
                    Progress through the lead pipeline
                  </CardDescription>
                </div>
                <div className="flex space-x-2">
                  <Button 
                    variant="outline" 
                    onClick={() => setIsStageModalOpen(true)}
                    disabled={!nextManualStage || isFinalStage}
                  >
                    {isFinalStage ? 'Complete' : `Move to ${nextManualStage}`}
                    {!isFinalStage && <ChevronRight className="ml-1 h-4 w-4" />}
                  </Button>
                  {isAdmin && (
                    <Button 
                      variant="outline" 
                      onClick={() => setIsAdminStageModalOpen(true)}
                    >
                      <Settings className="mr-2 h-4 w-4" />
                      Admin Stage Control
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Stage {currentStageIndex + 1} of {PIPELINE_STAGES.length}</span>
                  <span>{Math.round(progressPercentage)}% Complete</span>
                </div>
                <Progress value={progressPercentage} className="w-full" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Lead Data */}
          <div className="space-y-6">
            <LeadDataCard lead={lead} lastTask={lastTask} />
            
            {/* Task Creation */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <ClipboardList className="mr-2 h-5 w-5" />
                  Create Task
                </CardTitle>
              </CardHeader>
              <CardContent>
                <TaskComposer onTaskComplete={handleTaskComplete} currentStage={currentStage} />
              </CardContent>
            </Card>
          </div>

          {/* Middle Column - Actions & Details */}
          <div className="lg:col-span-2 space-y-6">
            <Tabs defaultValue="tasks" className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="tasks">Tasks</TabsTrigger>
                <TabsTrigger value="remarks">Remarks</TabsTrigger>
                <TabsTrigger value="history">Stage History</TabsTrigger>
                <TabsTrigger value="universities">Universities</TabsTrigger>
                <TabsTrigger value="documents">Documents</TabsTrigger>
              </TabsList>

              {/* Tasks Tab */}
              <TabsContent value="tasks" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <ClipboardList className="mr-2 h-5 w-5" />
                      Task History
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {tasksLoading ? (
                      <div className="text-center py-4">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                        <div>Loading tasks...</div>
                      </div>
                    ) : tasks.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <ClipboardList className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                        <p>No tasks recorded yet</p>
                        <p className="text-sm mt-2">Use the "Create Task" section to add your first task</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {tasks.map((task: TaskData, index: number) => (
                          <div key={task.id || index} className="border rounded-lg p-4">
                            <div className="flex justify-between items-start mb-2">
                              <div className="flex items-center space-x-2">
                                <Badge variant="outline">{task.taskType}</Badge>
                                {task.callType && <Badge variant="secondary">{task.callType}</Badge>}
                                {task.connectStatus && <Badge variant={
                                  task.connectStatus === 'Interested' ? 'default' : 
                                  task.connectStatus === 'Not Interested' ? 'destructive' : 'outline'
                                }>{task.connectStatus}</Badge>}
                              </div>
                              <div className="text-sm text-gray-500">
                                {new Date(task.createdAt || '').toLocaleDateString()}
                              </div>
                            </div>
                            {task.country && (
                              <p className="text-sm text-gray-600 mb-1">
                                <span className="font-medium">Country:</span> {task.country}
                              </p>
                            )}
                            {task.intake && (
                              <p className="text-sm text-gray-600 mb-1">
                                <span className="font-medium">Intake:</span> {task.intake}
                              </p>
                            )}
                            {task.remarks && (
                              <p className="text-sm text-gray-700 bg-gray-50 p-2 rounded mt-2">{task.remarks}</p>
                            )}
                            <div className="text-xs text-gray-500 mt-2">
                              By: {task.userName || currentUserName}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Remarks Tab */}
              <TabsContent value="remarks" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <MessageSquare className="mr-2 h-5 w-5" />
                      Remarks & Comments
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {remarksLoading ? (
                      <div className="text-center py-4">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                        <div>Loading remarks...</div>
                      </div>
                    ) : remarks.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                        <p>No remarks added yet</p>
                        <p className="text-sm mt-2">Remarks are automatically added when you complete tasks with comments</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {remarks.map((remark: RemarkData, index: number) => (
                          <div key={remark.id || index} className="border rounded-lg p-4">
                            <p className="text-sm text-gray-700 mb-2">{remark.content}</p>
                            <div className="text-xs text-gray-500 flex justify-between">
                              <span>By: {remark.userName || currentUserName}</span>
                              <span>{new Date(remark.createdAt).toLocaleDateString()}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Stage History Tab */}
              <TabsContent value="history" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Stage History</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {historyLoading ? (
                      <div className="text-center py-4">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                        <div>Loading history...</div>
                      </div>
                    ) : history.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <CheckCircle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                        <p>No stage changes recorded yet</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {history.map((item: StageHistoryData, index: number) => (
                          <div key={item.id || index} className="flex items-center space-x-4 p-3 border rounded">
                            <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                            <div className="flex-1">
                              <div className="flex items-center space-x-2">
                                <Badge variant="outline">{item.toStage}</Badge>
                                <span className="text-sm text-gray-500">
                                  {new Date(item.createdAt).toLocaleDateString()}
                                </span>
                              </div>
                              {item.reason && (
                                <p className="text-sm text-gray-600 mt-1">{item.reason}</p>
                              )}
                              <p className="text-xs text-gray-500 mt-1">
                                By: {item.userName || currentUserName}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Universities Tab */}
              <TabsContent value="universities" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>University Applications</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {appsLoading ? (
                      <div className="text-center py-4">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                        <div>Loading applications...</div>
                      </div>
                    ) : universityApps.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <ClipboardList className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                        <p>No university applications yet</p>
                        <p className="text-sm mt-2">Universities are added automatically when you complete credential logging tasks</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {universityApps.map((app: UniversityAppData, index: number) => (
                          <div key={app.id || index} className="border rounded-lg p-4">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <h4 className="font-medium">{app.universityName}</h4>
                                {app.universityUrl && (
                                  <a
                                    href={app.universityUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:underline text-sm"
                                  >
                                    {app.universityUrl}
                                  </a>
                                )}
                              </div>
                              <Badge variant={app.status === 'Completed' ? 'default' : 'outline'}>
                                {app.status || 'In Progress'}
                              </Badge>
                            </div>
                            {app.username && (
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                  <span className="font-medium">Username:</span> {app.username}
                                </div>
                                <div className="flex items-center">
                                  <span className="font-medium">Password:</span>
                                  <span className="ml-2 mr-2">
                                    {visiblePasswords[index] ? app.password : '••••••••'}
                                  </span>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => togglePasswordVisibility(index)}
                                  >
                                    {visiblePasswords[index] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                  </Button>
                                </div>
                              </div>
                            )}
                            {app.createdAt && (
                              <div className="text-xs text-gray-500 mt-2">
                                Added: {new Date(app.createdAt).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Documents Tab */}
              <TabsContent value="documents" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <FileText className="h-5 w-5 mr-2" />
                      Student Documents
                    </CardTitle>
                    <CardDescription>
                      Manage and track all required documents for the student's application process
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <DocumentsList leadId={leadId || ''} />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>
    </div>
  );
};

export default LeadWorkspace;
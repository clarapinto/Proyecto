import { useState, useEffect } from 'react';
import { Calendar, FileText, Clock } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import Card from '../shared/Card';
import Badge from '../shared/Badge';
import Button from '../shared/Button';
import ProposalView from './ProposalView';
import type { Database } from '../../lib/database.types';

type Request = Database['public']['Tables']['requests']['Row'];
type Invitation = Database['public']['Tables']['request_invitations']['Row'] & {
  request: Request;
};

export default function InvitationsList() {
  const { profile } = useAuth();
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [supplierId, setSupplierId] = useState<string | null>(null);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);

  useEffect(() => {
    if (profile?.email) {
      loadSupplierAndInvitations();
    }
  }, [profile]);

  const loadSupplierAndInvitations = async () => {
    if (!profile?.email) return;

    const { data: supplier } = await supabase
      .from('suppliers')
      .select('id')
      .eq('contact_email', profile.email)
      .maybeSingle();

    if (!supplier) {
      setLoading(false);
      return;
    }

    setSupplierId(supplier.id);

    const { data } = await supabase
      .from('request_invitations')
      .select(`
        *,
        request:requests(*)
      `)
      .eq('supplier_id', supplier.id)
      .order('invited_at', { ascending: false });

    if (data) {
      setInvitations(data as Invitation[]);
    }
    setLoading(false);
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Loading invitations...</div>;
  }

  if (selectedRequestId) {
    return (
      <ProposalView
        requestId={selectedRequestId}
        onBack={() => setSelectedRequestId(null)}
      />
    );
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Invitations</h1>
        <p className="text-gray-600">Procurement requests where you've been invited to bid</p>
      </div>

      {invitations.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-gray-500">No invitations at the moment</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {invitations.map((invitation) => {
            const request = invitation.request as Request;
            const deadline = request.round_deadline
              ? new Date(request.round_deadline)
              : null;
            const isExpired = deadline && deadline < new Date();

            return (
              <Card key={invitation.id} className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{request.title}</h3>
                      {isExpired ? (
                        <Badge variant="danger">Expired</Badge>
                      ) : (
                        <Badge variant="info">Active</Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mb-1">{request.request_number}</p>
                    <p className="text-sm text-gray-500 line-clamp-2">{request.description}</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-100 mb-4">
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <Calendar className="w-4 h-4" />
                    <span>
                      Invited:{' '}
                      {new Date(invitation.invited_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <Clock className="w-4 h-4" />
                    <span>
                      Deadline:{' '}
                      {deadline
                        ? deadline.toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                          })
                        : 'N/A'}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <FileText className="w-4 h-4" />
                    <span>Round {request.current_round}/{request.max_rounds}</span>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <Button
                    size="sm"
                    disabled={isExpired}
                    onClick={() => setSelectedRequestId(request.id)}
                  >
                    View Details & Submit Proposal
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
